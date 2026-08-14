import { useAuthCookie } from '~/lib/auth/composables/auth'
import type {
  ResumableUploadPart,
  UploadedPart
} from '~/lib/core/api/resumableUpload'

export type WorkbenchDrawing = {
  id: string
  projectId: string
  folderId: string | null
  name: string
  blobId: string
  convertedBlobId: string | null
  conversionStatus: string | null
  conversionError: string | null
  fileName: string
  fileType: string
  contentType: string
  fileSize: number | null
  creator: string
  updater: string
  createdAt: string
  updatedAt: string
}

export function useWorkbenchDrawingsApi() {
  const apiOrigin = useApiOrigin()
  const authCookie = useAuthCookie()

  const request = async <T>(path: string, options?: Parameters<typeof $fetch<T>>[1]) =>
    await $fetch<T>(`${apiOrigin}${path}`, {
      ...options,
      headers: {
        ...(options?.headers || {}),
        ...(authCookie.value ? { Authorization: `Bearer ${authCookie.value}` } : {})
      }
    })

  const listDrawings = async (params: {
    projectId: string
    folderId?: string | null
    search?: string | null
    cursor?: string | null
    limit?: number
  }) => {
    const { projectId, folderId, search, cursor, limit } = params
    const query: Record<string, string> = {}
    if (folderId) query.folderId = folderId
    if (search?.trim()) query.search = search.trim()
    if (cursor) query.cursor = cursor
    if (typeof limit === 'number') query.limit = String(limit)

    return (
      await request<{
        data: { items: WorkbenchDrawing[]; cursor: string | null }
      }>(`/api/v1/projects/${projectId}/drawings`, { query })
    ).data
  }

  const getDrawing = async (projectId: string, drawingId: string) =>
    (
      await request<{ data: WorkbenchDrawing }>(
        `/api/v1/projects/${projectId}/drawings/${drawingId}`
      )
    ).data

  const createMultipartUpload = async (projectId: string, fileName: string) =>
    (
      await request<{ data: { blobId: string; uploadId: string } }>(
        `/api/v1/projects/${projectId}/drawings/uploads/generate-url`,
        {
          method: 'POST',
          body: { fileName }
        }
      )
    ).data

  const getPartUploadUrl = async (
    projectId: string,
    payload: { blobId: string; uploadId: string; partNumber: number }
  ) =>
    (
      await request<{ data: { url: string; partNumber: number } }>(
        `/api/v1/projects/${projectId}/drawings/uploads/part-upload-url`,
        {
          method: 'POST',
          body: payload
        }
      )
    ).data

  const listUploadedParts = async (
    projectId: string,
    payload: { blobId: string; uploadId: string }
  ): Promise<UploadedPart[]> =>
    (
      await request<{ data: { parts: UploadedPart[] } }>(
        `/api/v1/projects/${projectId}/drawings/uploads/parts`,
        { query: payload }
      )
    ).data.parts || []

  const completeMultipartUpload = async (
    projectId: string,
    payload: { blobId: string; uploadId: string; parts: ResumableUploadPart[] }
  ) =>
    (
      await request<{ data: { blobId: string; fileSize: number | null; fileHash: string | null } }>(
        `/api/v1/projects/${projectId}/drawings/uploads/complete`,
        {
          method: 'POST',
          body: payload
        }
      )
    ).data

  const abortMultipartUpload = async (
    projectId: string,
    payload: { blobId: string; uploadId: string }
  ) => {
    await request(`/api/v1/projects/${projectId}/drawings/uploads/abort`, {
      method: 'POST',
      body: payload
    })
  }

  const createDrawing = async (
    projectId: string,
    payload: Pick<
      WorkbenchDrawing,
      'blobId' | 'fileName' | 'contentType' | 'fileSize' | 'folderId' | 'name'
    >
  ) =>
    (
      await request<{ data: WorkbenchDrawing }>(`/api/v1/projects/${projectId}/drawings`, {
        method: 'POST',
        body: payload
      })
    ).data

  const deleteDrawing = async (projectId: string, drawingId: string) => {
    await request(`/api/v1/projects/${projectId}/drawings/${drawingId}`, { method: 'DELETE' })
  }

  const convertToDxf = async (projectId: string, drawingId: string) => {
    await request(`/api/v1/projects/${projectId}/drawings/${drawingId}/convert-to-dxf`, {
      method: 'POST'
    })
  }

  const getDownloadUrl = async (projectId: string, drawingId: string) =>
    (
      await request<{ data: { url: string } }>(
        `/api/v1/projects/${projectId}/drawings/${drawingId}/download`
      )
    ).data.url

  return {
    listDrawings,
    getDrawing,
    createMultipartUpload,
    getPartUploadUrl,
    listUploadedParts,
    completeMultipartUpload,
    abortMultipartUpload,
    createDrawing,
    deleteDrawing,
    convertToDxf,
    getDownloadUrl
  }
}
