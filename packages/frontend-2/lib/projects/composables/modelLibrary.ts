import { useAuthCookie } from '~/lib/auth/composables/auth'

export type ModelLibraryProject = {
  id: string
  name: string
  usage: 'normal' | 'storage_only'
}

export type ModelLibraryModel = {
  id: string
  streamId: string
  authorId: string | null
  name: string
  description: string | null
  createdAt: string
  updatedAt: string
}

export type ModelLibraryEnsureModelResponse = {
  projectId: string
  projectName: string
  model: ModelLibraryModel
}

export type ModelLibraryPrepareUploadResponse = {
  projectId: string
  projectName: string
  modelId: string
  modelName: string
  fileId: string
  uploadUrl: string
}

export type ModelLibraryImportResponse = {
  id: string
  projectId: string
  projectName: string
  modelId: string
  modelName: string
  fileId?: string
}

export type ModelLibraryListItem = {
  id: string
  projectId: string
  title: string
  streamName?: string
  previewUrl?: string | null
  updateTime: string
  comments: number
  versions: number
}

export type ModelLibraryListResponse = {
  data: ModelLibraryListItem[]
  total: number
}

type UploadProgressCallback = (percentage: number) => void

export function useModelLibraryApi() {
  const apiOrigin = useApiOrigin()
  const authCookie = useAuthCookie()

  const getHeaders = () => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }

    if (authCookie.value) {
      headers.Authorization = `Bearer ${authCookie.value}`
    }

    return headers
  }

  const ensureProject = async (): Promise<ModelLibraryProject> => {
    const res = await $fetch<{ data: ModelLibraryProject }>(
      `${apiOrigin}/api/internal/model-library-project`,
      {
        headers: getHeaders()
      }
    )

    return res.data
  }

  const listModels = async (params?: {
    search?: string
    page?: number
    pageSize?: number
  }): Promise<ModelLibraryListResponse> => {
    const res = await $fetch<{ data: ModelLibraryListItem[]; total?: number }>(
      `${apiOrigin}/api/v1/models`,
      {
        headers: getHeaders(),
        params: {
          search: params?.search || '',
          member: 'all',
          source: 'all',
          page: params?.page || 1,
          pageSize: params?.pageSize || 30
        }
      }
    )

    return {
      data: res.data || [],
      total: res.total ?? 0
    }
  }

  const ensureModel = async (payload: {
    name: string
    description?: string
  }): Promise<ModelLibraryEnsureModelResponse> => {
    const res = await $fetch<{ data: ModelLibraryEnsureModelResponse }>(
      `${apiOrigin}/api/internal/model-library/models/ensure`,
      {
        method: 'POST',
        headers: getHeaders(),
        body: payload
      }
    )

    return res.data
  }

  const prepareUpload = async (payload: {
    fileName: string
    modelName: string
    modelDescription?: string
  }): Promise<ModelLibraryPrepareUploadResponse> => {
    const res = await $fetch<{ data: ModelLibraryPrepareUploadResponse }>(
      `${apiOrigin}/api/internal/model-library/uploads/prepare`,
      {
        method: 'POST',
        headers: getHeaders(),
        body: payload
      }
    )

    return res.data
  }

  const uploadToSignedUrl = async (
    file: File,
    uploadUrl: string,
    onProgress?: UploadProgressCallback
  ): Promise<{ etag: string }> => {
    const request = new XMLHttpRequest()

    return await new Promise<{ etag: string }>((resolve, reject) => {
      request.open('PUT', uploadUrl)
      request.setRequestHeader('Content-Type', file.type || 'application/octet-stream')

      request.upload.addEventListener('progress', (e) => {
        if (!e.lengthComputable) return
        onProgress?.((e.loaded / e.total) * 100)
      })

      request.addEventListener('load', () => {
        if (request.status < 200 || request.status >= 300) {
          return reject(
            new Error(`模型库文件上传失败${request.status ? ` (${request.status})` : ''}`)
          )
        }

        const etag = request.getResponseHeader('ETag')
        if (!etag) {
          return reject(new Error('模型库文件上传成功，但未返回 ETag'))
        }

        resolve({ etag })
      })

      request.addEventListener('error', () => {
        reject(new Error('模型库文件上传失败'))
      })

      request.send(file)
    })
  }

  const importUpload = async (payload: {
    etag: string
    fileId: string
    modelId?: string
    modelName?: string
    modelDescription?: string
  }): Promise<ModelLibraryImportResponse> => {
    const res = await $fetch<{ data: ModelLibraryImportResponse }>(
      `${apiOrigin}/api/internal/model-library/uploads/import`,
      {
        method: 'POST',
        headers: getHeaders(),
        body: payload
      }
    )

    return res.data
  }

  const uploadFile = async (
    payload: {
      file: File
      modelName: string
      modelDescription?: string
      modelId?: string
    },
    callbacks?: Partial<{
      onProgress: UploadProgressCallback
    }>
  ) => {
    const { file, modelName, modelDescription, modelId } = payload
    const { onProgress } = callbacks || {}

    const prepared = await prepareUpload({
      fileName: file.name,
      modelName,
      modelDescription
    })

    const { etag } = await uploadToSignedUrl(file, prepared.uploadUrl, onProgress)

    const imported = await importUpload({
      etag,
      fileId: prepared.fileId,
      modelId: modelId || prepared.modelId,
      modelName,
      modelDescription
    })

    return {
      prepared,
      imported
    }
  }

  return {
    ensureProject,
    listModels,
    ensureModel,
    prepareUpload,
    uploadToSignedUrl,
    importUpload,
    uploadFile
  }
}
