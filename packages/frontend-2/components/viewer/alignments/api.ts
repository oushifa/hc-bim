import { useAuthCookie } from '~/lib/auth/composables/auth'

export interface AlignmentTransform {
  dx: number
  dy: number
  dz: number
  scale: number
  rotationZ: number
}

export interface AlignmentPoint {
  x: number
  y: number
  z: number
}

export interface AlignmentCalibrationPoint {
  index: 1 | 2 | 3
  cad: AlignmentPoint
  speckle: AlignmentPoint
}

export interface AlignmentSectionBox {
  min: number[]
  max: number[]
  rotation?: number[]
}

export interface AlignmentCameraState {
  position: AlignmentPoint
  target: AlignmentPoint
  projection?: 'perspective' | 'orthographic'
  fov?: number
  zoom?: number
}

export interface AlignmentConfigCameraState {
  cad: AlignmentCameraState | null
  speckle: AlignmentCameraState | null
}

export interface AlignmentDrawing {
  id: string
  projectId: string
  blobId: string
  fileName: string
  fileType: string
  fileSize: number | null
  creator: string
  updater: string
  createdAt: string
  updatedAt: string
}

export interface AlignmentConfigDrawingRef {
  id: string
  fileName: string | null
  blobId: string | null
  fileType: string | null
  fileSize: number | null
}

export interface AlignmentConfig {
  id: string
  projectId: string
  name: string
  description: string | null
  drawingId: string | null
  drawingName: string | null
  splitRatio: number
  calibrationPoints: AlignmentCalibrationPoint[]
  transform: AlignmentTransform | null
  sectionBox: AlignmentSectionBox | null
  cameraState: AlignmentConfigCameraState | null
  creator: string
  updater: string
  createdAt: string
  updatedAt: string
  drawing: AlignmentConfigDrawingRef | null
  drawingDeleted: boolean
}

export type AlignmentConfigInput = {
  name: string
  description?: string | null
  drawingId?: string | null
  drawingName?: string | null
  splitRatio?: number
  calibrationPoints?: AlignmentCalibrationPoint[]
  transform?: AlignmentTransform | null
  sectionBox?: AlignmentSectionBox | null
  cameraState?: AlignmentConfigCameraState | null
}

type BlobUploadResponse = {
  uploadResults?: Array<{
    blobId?: string
    fileName?: string
    fileSize?: number | null
    uploadError?: string
  }>
}

const getAuthHeaders = (token: string | null, isFormData = false) => {
  const headers = new Headers()
  if (!isFormData) {
    headers.set('Content-Type', 'application/json')
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  return headers
}

export function useAlignmentApi() {
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

  const fetchDrawings = async (projectId: string) =>
    (await request<{ data: AlignmentDrawing[] }>(
      `/api/v1/projects/${projectId}/alignments/drawings`
    )).data

  const createDrawing = async (
    projectId: string,
    payload: Pick<AlignmentDrawing, 'blobId' | 'fileName' | 'fileType' | 'fileSize'>
  ) =>
    (
      await request<{ data: AlignmentDrawing }>(
        `/api/v1/projects/${projectId}/alignments/drawings`,
        {
          method: 'POST',
          body: payload
        }
      )
    ).data

  const deleteDrawing = async (projectId: string, drawingId: string) => {
    await request(`/api/v1/projects/${projectId}/alignments/drawings/${drawingId}`, {
      method: 'DELETE'
    })
  }

  const fetchConfigs = async (projectId: string) =>
    (await request<{ data: AlignmentConfig[] }>(
      `/api/v1/projects/${projectId}/alignments/configs`
    )).data

  const fetchConfigDetail = async (projectId: string, configId: string) =>
    (
      await request<{ data: AlignmentConfig }>(
        `/api/v1/projects/${projectId}/alignments/configs/${configId}`
      )
    ).data

  const createConfig = async (projectId: string, payload: AlignmentConfigInput) =>
    (
      await request<{ data: AlignmentConfig }>(
        `/api/v1/projects/${projectId}/alignments/configs`,
        {
          method: 'POST',
          body: payload
        }
      )
    ).data

  const updateConfig = async (
    projectId: string,
    configId: string,
    payload: Partial<AlignmentConfigInput>
  ) =>
    (
      await request<{ data: AlignmentConfig }>(
        `/api/v1/projects/${projectId}/alignments/configs/${configId}`,
        {
          method: 'PUT',
          body: payload
        }
      )
    ).data

  const deleteConfig = async (projectId: string, configId: string) => {
    await request(`/api/v1/projects/${projectId}/alignments/configs/${configId}`, {
      method: 'DELETE'
    })
  }

  const uploadDrawingFile = async (projectId: string, file: File) => {
    const formData = new FormData()
    formData.append('drawing', file)

    const response = await fetch(`${apiOrigin}/api/stream/${projectId}/blob`, {
      method: 'POST',
      headers: getAuthHeaders(authCookie.value || null, true),
      body: formData
    })

    if (!response.ok) {
      throw new Error('上传图纸文件失败')
    }

    const body = (await response.json()) as BlobUploadResponse
    const uploaded = body.uploadResults?.find((item) => item.blobId && !item.uploadError)

    if (!uploaded?.blobId) {
      throw new Error(uploaded?.uploadError || '未获取到 blobId')
    }

    return await createDrawing(projectId, {
      blobId: uploaded.blobId,
      fileName: uploaded.fileName || file.name,
      fileType: file.name.split('.').pop()?.toLowerCase() || 'dxf',
      fileSize: uploaded.fileSize ?? file.size
    })
  }

  const fetchDrawingBlobText = async (projectId: string, blobId: string) => {
    const response = await fetch(`${apiOrigin}/api/stream/${projectId}/blob/${blobId}`, {
      method: 'GET',
      headers: getAuthHeaders(authCookie.value || null, true)
    })
    if (!response.ok) {
      throw new Error('读取图纸文件失败')
    }
    return await response.text()
  }

  const fetchDrawingBlob = async (projectId: string, blobId: string) => {
    const response = await fetch(`${apiOrigin}/api/stream/${projectId}/blob/${blobId}`, {
      method: 'GET',
      headers: getAuthHeaders(authCookie.value || null, true)
    })
    if (!response.ok) {
      throw new Error('读取图纸文件失败')
    }
    return await response.blob()
  }

  return {
    fetchDrawings,
    fetchConfigs,
    fetchConfigDetail,
    createConfig,
    updateConfig,
    deleteConfig,
    deleteDrawing,
    uploadDrawingFile,
    fetchDrawingBlobText,
    fetchDrawingBlob
  }
}
