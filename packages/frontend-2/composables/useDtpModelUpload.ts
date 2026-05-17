import { useStorage } from '@vueuse/core'
import { useApolloClient } from '@vue/apollo-composable'
import gql from 'graphql-tag'
import type { FetchError } from 'ofetch'
import {
  GetModelUploadsDocument,
  type GetModelUploadsQuery
} from '~/lib/common/generated/gql/graphql'
import { ToastNotificationType, useGlobalToast } from '~~/lib/common/composables/toast'
import { useActiveUser } from '~~/lib/auth/composables/activeUser'

const DTP_TOKEN_STORAGE_KEY = 'dtp-token'
const DTP_MODEL_UPLOAD_SYNC_STORAGE_KEY = 'dtp-model-upload-sync'
const DTP_AES_KEY = 'Ze/0w7rnQg7jznntRcuxGQ=='
const DTP_MIN_MULTI_PART_CHUNK_SIZE = 8 * 1024 * 1024 + 1
const DTP_PREFERRED_CHUNK_SIZE = 16 * 1024 * 1024
const VERSION_ID_RESOLVE_RETRY_COUNT = 5
const VERSION_ID_RESOLVE_RETRY_DELAY = 1500

type DtpTokenIdentity = Partial<{
  loginId: string
  mobile: string
  email: string
  username: string
}>

type DtpUploadConfig = {
  uploadUrl: string
  uploadPathPrefix: string
  uploadToken: string
}

type DtpUploadResult = {
  assetId: string
  seedId: string
}

type PendingDtpModelUploadRecord = {
  fileUploadId: string
  projectId: string
  modelId: string
  fileName: string
  versionId?: string
  assetId?: string
  seedId?: string
  status: 'pending' | 'uploading' | 'uploaded' | 'synced' | 'error'
  error?: string
  updatedAt: string
}

const updateVersionExternalIdsMutation = gql`
  mutation UpdateVersionExternalIds($input: UpdateVersionInput!) {
    versionMutations {
      update(input: $input) {
        id
        message
      }
    }
  }
`

const sleep = async (ms: number) =>
  await new Promise((resolve) => setTimeout(resolve, ms))

const buildAssetName = (fileName: string) =>
  fileName.replace(/\.[^/.]+$/, '') || fileName

const resolveChunkPlan = (fileSize: number) => {
  const preferredParts = Math.max(1, Math.ceil(fileSize / DTP_PREFERRED_CHUNK_SIZE))
  const maxValidMultiParts = Math.max(
    1,
    Math.floor(fileSize / DTP_MIN_MULTI_PART_CHUNK_SIZE)
  )
  const totalPart = Math.min(preferredParts, maxValidMultiParts)

  return Array.from({ length: totalPart }, (_, part) => {
    const start = Math.floor((fileSize * part) / totalPart)
    const end =
      part === totalPart - 1
        ? fileSize
        : Math.floor((fileSize * (part + 1)) / totalPart)

    return {
      part,
      start,
      end,
      size: end - start,
      lastChunk: part === totalPart - 1,
      totalPart
    }
  })
}

const resolveIdentity = (
  activeUser: ReturnType<typeof useActiveUser>['activeUser']['value'],
  identity?: DtpTokenIdentity
) => {
  const loginId = identity?.loginId?.trim()
  const mobile = identity?.mobile?.trim()
  const email = identity?.email?.trim()
  const username = identity?.username?.trim() || activeUser?.name?.trim()

  if (mobile) {
    return {
      mobile,
      ...(username ? { username } : {})
    }
  }

  if (email) {
    return {
      email,
      ...(username ? { username } : {})
    }
  }

  if (loginId) {
    const key = loginId.includes('@') ? 'email' : 'mobile'
    return {
      [key]: loginId,
      ...(username ? { username } : {})
    }
  }

  const fallbackLogin = activeUser?.email?.trim()
  if (!fallbackLogin) return null

  return {
    [fallbackLogin.includes('@') ? 'email' : 'mobile']: fallbackLogin,
    ...(username ? { username } : {})
  }
}

export const useDtpModelUpload = () => {
  const apollo = useApolloClient().client
  const { $dtpFetch } = useNuxtApp()
  const logger = useLogger()
  const { triggerNotification } = useGlobalToast()
  const { activeUser } = useActiveUser()
  const dtpFetch = $dtpFetch as <T = unknown>(
    request: string,
    options?: {
      method?: string
      headers?: HeadersInit
      body?: BodyInit | Record<string, unknown> | null
      originPath?: boolean
    }
  ) => Promise<T>

  const fakeRecords = ref<Record<string, PendingDtpModelUploadRecord>>({})
  const storedRecords = import.meta.server
    ? fakeRecords
    : useStorage<Record<string, PendingDtpModelUploadRecord>>(
        DTP_MODEL_UPLOAD_SYNC_STORAGE_KEY,
        {}
      )

  const getRecord = (fileUploadId: string) => storedRecords.value[fileUploadId]

  const upsertRecord = (
    fileUploadId: string,
    patch: Partial<PendingDtpModelUploadRecord> &
      Pick<PendingDtpModelUploadRecord, 'projectId' | 'modelId' | 'fileName' | 'status'>
  ) => {
    storedRecords.value = {
      ...storedRecords.value,
      [fileUploadId]: {
        ...getRecord(fileUploadId),
        fileUploadId,
        ...patch,
        updatedAt: new Date().toISOString()
      }
    }

    return storedRecords.value[fileUploadId]
  }

  const patchRecord = (
    fileUploadId: string,
    patch: Partial<PendingDtpModelUploadRecord>
  ): PendingDtpModelUploadRecord | null => {
    const current = getRecord(fileUploadId)
    if (!current) return null

    storedRecords.value = {
      ...storedRecords.value,
      [fileUploadId]: {
        ...current,
        ...patch,
        updatedAt: new Date().toISOString()
      }
    }

    return storedRecords.value[fileUploadId]
  }

  const removeRecord = (fileUploadId: string) => {
    const next = { ...storedRecords.value }
    delete next[fileUploadId]
    storedRecords.value = next
  }

  const getStoredDtpToken = () => {
    if (!import.meta.client) return null
    return localStorage.getItem(DTP_TOKEN_STORAGE_KEY)
  }

  const setStoredDtpToken = (token: string) => {
    if (!import.meta.client) return
    localStorage.setItem(DTP_TOKEN_STORAGE_KEY, token)
  }

  const ensureDtpToken = async (identity?: DtpTokenIdentity) => {
    const existing = getStoredDtpToken()
    if (existing) return existing

    const resolvedIdentity = resolveIdentity(activeUser.value, identity)
    if (!resolvedIdentity) return null

    const dtpOrigin = useDtpApiOrigin()
    if (!dtpOrigin?.trim()) return null

    try {
      const CryptoJS = await import('crypto-js')
      const encrypted = CryptoJS.AES.encrypt(
        CryptoJS.enc.Utf8.parse(JSON.stringify(resolvedIdentity)),
        CryptoJS.enc.Utf8.parse(DTP_AES_KEY),
        {
          mode: CryptoJS.mode.ECB,
          padding: CryptoJS.pad.Pkcs7
        }
      )

      const response = await fetch(`${dtpOrigin}/v1/login/third-party`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({
          token: encrypted.toString()
        })
      })

      if (!response.ok) return null

      const responseData = await response.json()
      const token =
        responseData?.results?.tokens?.[0] ||
        responseData?.results?.token ||
        responseData?.token ||
        null

      if (!token) return null

      setStoredDtpToken(token)
      return token
    } catch (error) {
      logger.warn(error, '获取 DTP token 失败')
      return null
    }
  }

  const getUploadConfig = async (): Promise<DtpUploadConfig> => {
    const token = await ensureDtpToken()
    if (!token) {
      throw new Error('获取中海访问令牌失败')
    }

    const response = await dtpFetch<{
      results?: Partial<{
        uploadUrl: string
        uploadUrlV2: string
        uploadPathPrefix: string
        uploadToken: string
      }>
      result?: Partial<{
        uploadUrl: string
        uploadUrlV2: string
        uploadPathPrefix: string
        uploadToken: string
      }>
    }>('/v1/asset/model/upload/config', {
      method: 'GET'
    })

    const result = response.results || response.result
    const uploadUrl = result?.uploadUrlV2 || result?.uploadUrl
    const uploadPathPrefix = result?.uploadPathPrefix
    const uploadToken = result?.uploadToken

    if (!uploadUrl || !uploadPathPrefix || !uploadToken) {
      throw new Error('获取中海上传配置失败')
    }

    return {
      uploadUrl: uploadUrl.replace(/[`"'\\s]/g, ''),
      uploadPathPrefix,
      uploadToken
    }
  }

  const uploadFileToDtp = async (params: {
    file: File
    fileUploadId: string
    projectId: string
    modelId: string
  }): Promise<DtpUploadResult> => {
    const { file, fileUploadId, projectId, modelId } = params
    const existing = getRecord(fileUploadId)
    if (existing?.status === 'uploaded' || existing?.status === 'synced') {
      if (existing.assetId && existing.seedId) {
        return {
          assetId: existing.assetId,
          seedId: existing.seedId
        }
      }
    }

    upsertRecord(fileUploadId, {
      projectId,
      modelId,
      fileName: file.name,
      status: 'uploading',
      error: undefined
    })

    const { uploadUrl, uploadPathPrefix, uploadToken } = await getUploadConfig()
    const chunkPlan = resolveChunkPlan(file.size)
    const assetName = buildAssetName(file.name)
    const path = `${uploadPathPrefix}${file.name}`

    let finalResult: DtpUploadResult | null = null

    for (const chunkMeta of chunkPlan) {
      const chunk = file.slice(chunkMeta.start, chunkMeta.end)
      const formData = new FormData()
      formData.append('path', path)
      formData.append('size', String(chunk.size))
      formData.append('totalSize', String(file.size))
      formData.append('offset', String(chunkMeta.start))
      formData.append('totalPart', String(chunkMeta.totalPart))
      formData.append('part', String(chunkMeta.part))
      formData.append('lastChunk', String(chunkMeta.lastChunk))
      formData.append('file', chunk, file.name)
      formData.append('assetName', assetName)
      formData.append('folderId', '')

      const response = await dtpFetch<{
        result?: Partial<{
          assetId: string
          seedId: string
        }>
      }>(uploadUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${uploadToken}`
        },
        body: formData,
        originPath: true
      })

      if (chunkMeta.lastChunk) {
        const assetId = response?.result?.assetId
        const seedId = response?.result?.seedId
        if (!assetId || !seedId) {
          throw new Error('中海上传完成后未返回 assetId 或 seedId')
        }

        finalResult = {
          assetId,
          seedId
        }
      }
    }

    if (!finalResult) {
      throw new Error('中海上传失败，未获得最终上传结果')
    }

    patchRecord(fileUploadId, {
      assetId: finalResult.assetId,
      seedId: finalResult.seedId,
      status: 'uploaded',
      error: undefined
    })

    return finalResult
  }

  const queryConvertedVersionId = async (params: {
    projectId: string
    modelId: string
    fileUploadId: string
  }) => {
    const { data } = await apollo.query<GetModelUploadsQuery>({
      query: GetModelUploadsDocument,
      variables: {
        projectId: params.projectId,
        modelId: params.modelId,
        input: {
          limit: 50
        }
      },
      fetchPolicy: 'network-only'
    })

    const target = data.project.model.uploads.items.find(
      (item) => item.id === params.fileUploadId
    )
    return target?.convertedVersionId || null
  }

  const resolveConvertedVersionId = async (params: {
    projectId: string
    modelId: string
    fileUploadId: string
  }) => {
    for (let attempt = 0; attempt < VERSION_ID_RESOLVE_RETRY_COUNT; attempt++) {
      const versionId = await queryConvertedVersionId(params)
      if (versionId) return versionId
      await sleep(VERSION_ID_RESOLVE_RETRY_DELAY)
    }

    return null
  }

  const trySyncVersionMetadata = async (fileUploadId: string) => {
    const record = getRecord(fileUploadId)
    if (!record?.projectId || !record.versionId || !record.seedId || !record.assetId) {
      return false
    }

    if (record.status === 'synced') return true

    const { data, errors } = await apollo.mutate<{
      versionMutations?: {
        update?: {
          id: string
        }
      }
    }>({
      mutation: updateVersionExternalIdsMutation,
      variables: {
        input: {
          projectId: record.projectId,
          versionId: record.versionId,
          seedId: record.seedId,
          assetId: record.assetId
        }
      }
    })

    if (!data?.versionMutations?.update?.id) {
      const errMsg =
        (errors?.[0]?.message as string | undefined) || '回填中海模型标识失败'
      patchRecord(fileUploadId, {
        status: 'error',
        error: errMsg
      })
      throw new Error(errMsg)
    }

    removeRecord(fileUploadId)
    return true
  }

  const syncModelFileAfterSpeckleUpload = async (params: {
    file: File
    fileUploadId: string
    projectId: string
    modelId: string
  }) => {
    try {
      await uploadFileToDtp(params)
      await trySyncVersionMetadata(params.fileUploadId)
    } catch (error) {
      const message =
        (error as FetchError)?.data?.message ||
        (error instanceof Error ? error.message : '中海模型上传失败')

      patchRecord(params.fileUploadId, {
        status: 'error',
        error: message
      })

      triggerNotification({
        type: ToastNotificationType.Danger,
        title: '中海模型同步失败',
        description: message
      })
    }
  }

  const markVersionReadyForSync = async (params: {
    fileUploadId: string
    projectId: string
    modelId: string
  }) => {
    const { fileUploadId, projectId, modelId } = params
    const versionId = await resolveConvertedVersionId(params)
    if (!versionId) return null

    const existing = getRecord(fileUploadId)
    if (!existing) return null

    patchRecord(fileUploadId, {
      projectId,
      modelId,
      versionId
    })

    await trySyncVersionMetadata(fileUploadId).catch((error) => {
      logger.warn(error, '版本外部标识回填失败')
    })

    return versionId
  }

  return {
    ensureDtpToken,
    syncModelFileAfterSpeckleUpload,
    markVersionReadyForSync
  }
}
