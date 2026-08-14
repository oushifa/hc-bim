import { useAuthCookie } from '~/lib/auth/composables/auth'
import {
  resumableUpload,
  type ResumableUploadBackend,
  type ResumableUploadPart,
  type UploadedPart
} from '~/lib/core/api/resumableUpload'

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
  uploadId: string
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

  const getPartUploadUrl = async (params: {
    fileId: string
    uploadId: string
    partNumber: number
  }): Promise<string> => {
    const res = await $fetch<{ data: { url: string; partNumber: number } }>(
      `${apiOrigin}/api/internal/model-library/uploads/part-upload-url`,
      {
        method: 'POST',
        headers: getHeaders(),
        body: params
      }
    )

    return res.data.url
  }

  const listUploadedParts = async (params: {
    fileId: string
    uploadId: string
  }): Promise<UploadedPart[]> => {
    const res = await $fetch<{ data: { parts: UploadedPart[] } }>(
      `${apiOrigin}/api/internal/model-library/uploads/parts`,
      {
        headers: getHeaders(),
        query: params
      }
    )

    return res.data.parts || []
  }

  const abortUpload = async (params: {
    fileId: string
    uploadId: string
  }): Promise<void> => {
    await $fetch(`${apiOrigin}/api/internal/model-library/uploads/abort`, {
      method: 'POST',
      headers: getHeaders(),
      body: params
    })
  }

  const importUpload = async (payload: {
    uploadId: string
    parts: ResumableUploadPart[]
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

    const backend: ResumableUploadBackend = {
      createMultipart: async () => ({
        fileId: prepared.fileId,
        uploadId: prepared.uploadId
      }),
      getPartUploadUrl,
      listUploadedParts,
      completeMultipart: async ({ fileId, uploadId, parts }) =>
        await importUpload({
          uploadId,
          parts,
          fileId,
          modelId: modelId || prepared.modelId,
          modelName,
          modelDescription
        }),
      abortMultipart: abortUpload
    }

    const uploaded = await resumableUpload(backend, {
      file,
      onProgress,
      storageKey: `model-library:${prepared.fileId}`
    })

    return {
      prepared,
      imported: uploaded.result as ModelLibraryImportResponse
    }
  }

  return {
    ensureProject,
    listModels,
    ensureModel,
    prepareUpload,
    getPartUploadUrl,
    listUploadedParts,
    importUpload,
    abortUpload,
    uploadFile
  }
}
