import { useAuthCookie } from '~/lib/auth/composables/auth'

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

export function useViewerObjectCustomAttributes() {
  const config = useRuntimeConfig()
  const authCookie = useAuthCookie()

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

  return {
    fetchAttributes,
    createAttribute,
    deleteAttribute
  }
}
