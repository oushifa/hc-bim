/**
 * Shared resumable (multipart) upload module.
 *
 * Splits a File into parts, uploads each part via backend-provided pre-signed
 * URLs, and persists progress so an interrupted upload can resume from the
 * parts that were already persisted in object storage.
 *
 * The backend integration points are abstracted behind `ResumableUploadBackend`
 * so the same engine can drive the model library, workbench model sync and
 * drawings upload flows.
 */

export type ResumableUploadPart = {
  partNumber: number
  etag: string
}

export type UploadedPart = ResumableUploadPart & { size: number }

export type ResumableUploadBackend = {
  createMultipart: (fileName: string) => Promise<{ fileId: string; uploadId: string }>
  getPartUploadUrl: (params: {
    fileId: string
    uploadId: string
    partNumber: number
  }) => Promise<string>
  listUploadedParts: (params: {
    fileId: string
    uploadId: string
  }) => Promise<UploadedPart[]>
  completeMultipart: (params: {
    fileId: string
    uploadId: string
    parts: ResumableUploadPart[]
  }) => Promise<unknown>
  abortMultipart: (params: { fileId: string; uploadId: string }) => Promise<void>
}

export type ResumableUploadOptions = {
  file: File
  partSize?: number
  concurrency?: number
  onProgress?: (percentage: number) => void
  storageKey?: string
}

const DEFAULT_PART_SIZE = 16 * 1024 * 1024 // 16 MiB
const MIN_PART_SIZE = 5 * 1024 * 1024 // S3 requires >= 5MiB for non-last parts
const DEFAULT_CONCURRENCY = 4
const MAX_PART_RETRIES = 3

type PersistedState = {
  fileId: string
  uploadId: string
  fileName: string
  fileSize: number
  partSize: number
  parts: ResumableUploadPart[]
}

const buildStorageKey = (key: string) => `resumable-upload:${key}`

const readState = (key: string): PersistedState | null => {
  if (typeof window === 'undefined' || !window.localStorage) return null
  try {
    const raw = window.localStorage.getItem(buildStorageKey(key))
    if (!raw) return null
    return JSON.parse(raw) as PersistedState
  } catch {
    return null
  }
}

const writeState = (key: string, state: PersistedState) => {
  if (typeof window === 'undefined' || !window.localStorage) return
  try {
    window.localStorage.setItem(buildStorageKey(key), JSON.stringify(state))
  } catch {
    // Ignore quota errors; the upload can still proceed without persistence.
  }
}

const clearState = (key: string) => {
  if (typeof window === 'undefined' || !window.localStorage) return
  try {
    window.localStorage.removeItem(buildStorageKey(key))
  } catch {
    // Ignore
  }
}

const resolveChunkPlan = (fileSize: number, partSize: number) => {
  const count = Math.max(1, Math.ceil(fileSize / partSize))
  const plan: Array<{ partNumber: number; start: number; end: number }> = []
  for (let i = 0; i < count; i++) {
    const start = i * partSize
    const end = Math.min(start + partSize, fileSize)
    plan.push({ partNumber: i + 1, start, end })
  }
  return plan
}

const putFile = (
  url: string,
  blob: Blob,
  onProgress?: (loaded: number) => void
): Promise<{ etag: string }> =>
  new Promise((resolve, reject) => {
    const request = new XMLHttpRequest()
    request.open('PUT', url)
    request.setRequestHeader('Content-Type', 'application/octet-stream')

    request.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) onProgress(e.loaded)
    })

    request.addEventListener('load', () => {
      if (request.status < 200 || request.status >= 300) {
        return reject(new Error(`Part upload failed (${request.status})`))
      }
      const etag = request.getResponseHeader('ETag')
      if (!etag) return reject(new Error('Part upload succeeded but returned no ETag'))
      resolve({ etag })
    })
    request.addEventListener('error', () => reject(new Error('Part upload failed')))
    request.addEventListener('abort', () => reject(new Error('Part upload aborted')))

    request.send(blob)
  })

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export const resumableUpload = async (
  backend: ResumableUploadBackend,
  options: ResumableUploadOptions
): Promise<{ result: unknown; fileId: string; uploadId: string }> => {
  const { file, onProgress } = options
  const partSize = Math.max(MIN_PART_SIZE, options.partSize ?? DEFAULT_PART_SIZE)
  const concurrency = Math.max(1, options.concurrency ?? DEFAULT_CONCURRENCY)
  const storageKey = options.storageKey || `${file.name}:${file.size}:${file.lastModified}`

  const reportProgress = (completed: number) => {
    if (!onProgress || file.size <= 0) return
    const pct = Math.min(100, Math.round((completed / file.size) * 100))
    onProgress(pct)
  }

  let state = readState(storageKey)

  // Reuse the persisted upload session only when it matches this exact file.
  if (
    !state ||
    state.fileName !== file.name ||
    state.fileSize !== file.size ||
    state.partSize !== partSize
  ) {
    state = null
    clearState(storageKey)
  }

  if (!state) {
    const created = await backend.createMultipart(file.name)
    state = {
      fileId: created.fileId,
      uploadId: created.uploadId,
      fileName: file.name,
      fileSize: file.size,
      partSize,
      parts: []
    }
    writeState(storageKey, state)
  }

  const chunkPlan = resolveChunkPlan(file.size, partSize)

  // Reconcile with the server so we never re-upload parts that already exist.
  let uploadedParts: UploadedPart[] = []
  try {
    uploadedParts = await backend.listUploadedParts({
      fileId: state.fileId,
      uploadId: state.uploadId
    })
  } catch {
    uploadedParts = state.parts.map((part) => ({ ...part, size: 0 }))
  }

  const uploadedByPart = new Map(uploadedParts.map((part) => [part.partNumber, part]))
  const completedParts: ResumableUploadPart[] = []
  let completedBytes = 0

  for (const chunk of chunkPlan) {
    const existing = uploadedByPart.get(chunk.partNumber)
    if (existing) {
      completedParts.push({ partNumber: existing.partNumber, etag: existing.etag })
      completedBytes += chunk.end - chunk.start
    }
  }

  const pendingChunks = chunkPlan.filter(
    (chunk) => !uploadedByPart.has(chunk.partNumber)
  )

  reportProgress(completedBytes)

  const stateParts: ResumableUploadPart[] = [...completedParts]
  const inFlightBytes = new Map<number, number>()

  const reportAggregatedProgress = () => {
    let total = completedBytes
    for (const loaded of inFlightBytes.values()) total += loaded
    reportProgress(total)
  }

  let cursor = 0
  const worker = async () => {
    while (cursor < pendingChunks.length) {
      const index = cursor
      cursor += 1
      const chunk = pendingChunks[index]

      for (let attempt = 0; attempt <= MAX_PART_RETRIES; attempt++) {
        try {
          const url = await backend.getPartUploadUrl({
            fileId: state!.fileId,
            uploadId: state!.uploadId,
            partNumber: chunk.partNumber
          })
          const blob = file.slice(chunk.start, chunk.end)
          const { etag } = await putFile(url, blob, (loaded) => {
            inFlightBytes.set(chunk.partNumber, loaded)
            reportAggregatedProgress()
          })
          inFlightBytes.delete(chunk.partNumber)
          stateParts.push({ partNumber: chunk.partNumber, etag })
          completedBytes += chunk.end - chunk.start
          reportAggregatedProgress()
          writeState(storageKey, {
            ...state!,
            parts: [...stateParts]
          })
          break
        } catch (err) {
          inFlightBytes.delete(chunk.partNumber)
          if (attempt === MAX_PART_RETRIES) {
            throw err
          }
          await sleep(250 * (attempt + 1))
        }
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()))

  // Ensure parts are ordered before completing the upload.
  const orderedParts = chunkPlan
    .map((chunk) => stateParts.find((part) => part.partNumber === chunk.partNumber))
    .filter((part): part is ResumableUploadPart => !!part)

  const result = await backend.completeMultipart({
    fileId: state!.fileId,
    uploadId: state!.uploadId,
    parts: orderedParts
  })

  clearState(storageKey)
  reportProgress(file.size)

  return { result, fileId: state!.fileId, uploadId: state!.uploadId }
}

export const abortResumableUpload = async (
  backend: ResumableUploadBackend,
  options: { storageKey?: string; fileId?: string; uploadId?: string }
) => {
  const state = options.storageKey ? readState(options.storageKey) : null
  const fileId = options.fileId || state?.fileId
  const uploadId = options.uploadId || state?.uploadId
  if (fileId && uploadId) {
    await backend.abortMultipart({ fileId, uploadId })
  }
  if (options.storageKey) clearState(options.storageKey)
}
