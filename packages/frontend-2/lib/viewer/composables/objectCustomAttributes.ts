import { useAuthCookie } from '~/lib/auth/composables/auth'
import { useDtpModelUpload } from '~/composables/useDtpModelUpload'

export type ViewerObjectCustomAttribute = {
  id: string
  projectId: string
  modelId: string
  applicationId: string
  authorId: string | null
  name: string
  value: string
  createdAt: string
  updatedAt: string
}

export type ViewerObjectCustomAttributesCustomLabelPayloadResult = {
  fileName: string
  versionId: string
  treeJson: string
}

export type ViewerObjectCustomAttributesDtpSyncResult = {
  status?: string
  messages?: string
  result?: {
    originElementCount?: number
    originValidElementCount?: number
    importParameterCount?: number
  }
}

export function useViewerObjectCustomAttributes() {
  const config = useRuntimeConfig()
  const authCookie = useAuthCookie()
  const { $dtpFetch } = useNuxtApp()
  const { ensureDtpToken } = useDtpModelUpload()

  const dtpFetch = $dtpFetch as <T = unknown>(
    request: string,
    options?: {
      method?: string
      headers?: HeadersInit
      body?: BodyInit | Record<string, unknown> | null
      originPath?: boolean
      prefix?: string
    }
  ) => Promise<T>

  const getHeaders = () => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }
    if (authCookie.value) {
      headers['Authorization'] = `Bearer ${authCookie.value}`
    }
    return headers
  }

  const fetchAttributes = async (
    projectId: string,
    modelId: string,
    applicationId?: string
  ): Promise<ViewerObjectCustomAttribute[]> => {
    const res = await $fetch<{ data: ViewerObjectCustomAttribute[] }>(
      `${config.public.apiOrigin}/api/projects/${projectId}/viewer-object-custom-attributes`,
      {
        headers: getHeaders(),
        query: {
          modelId,
          ...(applicationId ? { applicationId } : {})
        }
      }
    )
    return res.data
  }

  const createAttribute = async (
    projectId: string,
    modelId: string,
    payload: { applicationId: string; name: string; value: string }
  ): Promise<ViewerObjectCustomAttribute> => {
    const res = await $fetch<{ data: ViewerObjectCustomAttribute }>(
      `${config.public.apiOrigin}/api/projects/${projectId}/viewer-object-custom-attributes`,
      {
        method: 'POST',
        headers: getHeaders(),
        query: { modelId },
        body: payload
      }
    )
    return res.data
  }

  const deleteAttribute = async (
    projectId: string,
    modelId: string,
    attributeId: string
  ): Promise<void> => {
    await $fetch(
      `${config.public.apiOrigin}/api/projects/${projectId}/viewer-object-custom-attributes/${attributeId}`,
      {
        method: 'DELETE',
        headers: getHeaders(),
        query: { modelId }
      }
    )
  }

  const updateAttribute = async (
    projectId: string,
    modelId: string,
    attributeId: string,
    payload: { name: string; value: string }
  ): Promise<ViewerObjectCustomAttribute> => {
    const res = await $fetch<{ data: ViewerObjectCustomAttribute }>(
      `${config.public.apiOrigin}/api/projects/${projectId}/viewer-object-custom-attributes/${attributeId}`,
      {
        method: 'PATCH',
        headers: getHeaders(),
        query: { modelId },
        body: payload
      }
    )
    return res.data
  }

  const getCustomLabelPayload = async (
    projectId: string,
    modelId: string
  ): Promise<ViewerObjectCustomAttributesCustomLabelPayloadResult> => {
    const res = await $fetch<{
      data: ViewerObjectCustomAttributesCustomLabelPayloadResult
    }>(
      `${config.public.apiOrigin}/api/projects/${projectId}/viewer-object-custom-attributes/custom-label-payload`,
      {
        method: 'POST',
        headers: getHeaders(),
        query: { modelId }
      }
    )
    return res.data
  }

  const syncCustomAttributesToDtp = async (
    projectId: string,
    modelId: string
  ): Promise<ViewerObjectCustomAttributesDtpSyncResult> => {
    const generated = await getCustomLabelPayload(projectId, modelId)
    await ensureDtpToken()

    const blob = new Blob([generated.treeJson], {
      type: 'application/json'
    })
    const formData = new FormData()
    formData.append('file', blob, generated.fileName)

    return await dtpFetch<ViewerObjectCustomAttributesDtpSyncResult>(
      '/v1/daas/asset/bim/elements/custom-label-import',
      {
        method: 'POST',
        body: formData
      }
    )
  }

  return {
    fetchAttributes,
    createAttribute,
    deleteAttribute,
    updateAttribute,
    getCustomLabelPayload,
    syncCustomAttributesToDtp
  }
}
