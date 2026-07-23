import { useAuthCookie } from '~/lib/auth/composables/auth'

export type ViewerCatalogNode = {
  id: string
  title: string
  locked?: boolean
  isolatedApplicationIds?: string[]
  hiddenApplicationIds?: string[]
  childrens?: ViewerCatalogNode[]
}

export type ViewerCatalog = {
  id: string
  projectId: string
  modelId: string
  authorId: string | null
  title: string
  treeData: ViewerCatalogNode[]
  createdAt: string
  updatedAt: string
}

export function useViewerCatalogs() {
  const apiOrigin = useApiOrigin()
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

  const fetchCatalogs = async (
    projectId: string,
    modelId: string
  ): Promise<ViewerCatalog[]> => {
    const res = await $fetch<{ data: ViewerCatalog[] }>(
      `${apiOrigin}/api/projects/${projectId}/viewer-catalogs`,
      {
        headers: getHeaders(),
        query: { modelId }
      }
    )
    return res.data
  }

  const createCatalog = async (
    projectId: string,
    modelId: string,
    title: string,
    treeData: ViewerCatalogNode[] = []
  ): Promise<ViewerCatalog> => {
    const res = await $fetch<{ data: ViewerCatalog }>(
      `${apiOrigin}/api/projects/${projectId}/viewer-catalogs`,
      {
        method: 'POST',
        headers: getHeaders(),
        query: { modelId },
        body: { title, treeData }
      }
    )
    return res.data
  }

  const updateCatalog = async (
    projectId: string,
    modelId: string,
    catalogId: string,
    payload: { title?: string; treeData?: ViewerCatalogNode[] }
  ): Promise<ViewerCatalog> => {
    const res = await $fetch<{ data: ViewerCatalog }>(
      `${apiOrigin}/api/projects/${projectId}/viewer-catalogs/${catalogId}`,
      {
        method: 'PUT',
        headers: getHeaders(),
        query: { modelId },
        body: payload
      }
    )
    return res.data
  }

  const deleteCatalog = async (
    projectId: string,
    modelId: string,
    catalogId: string
  ): Promise<void> => {
    await $fetch(
      `${apiOrigin}/api/projects/${projectId}/viewer-catalogs/${catalogId}`,
      {
        method: 'DELETE',
        headers: getHeaders(),
        query: { modelId }
      }
    )
  }

  return {
    fetchCatalogs,
    createCatalog,
    updateCatalog,
    deleteCatalog
  }
}
