import type { useFilteringDataStore } from '~/lib/viewer/composables/filtering/dataStore'

export type CatalogNodeFilterState = {
  isolatedApplicationIds: string[]
  hiddenApplicationIds: string[]
}

type CatalogNodeLike = {
  isolatedApplicationIds?: string[]
  hiddenApplicationIds?: string[]
  childrens?: CatalogNodeLike[]
}

/**
 * 目录节点是否保存过树结构（隐藏/隔离状态）。
 * 保存过的节点一定带有这两个字段（哪怕为空数组），未保存过的节点则没有。
 */
export const hasSavedCatalogNodeFilterState = (node: CatalogNodeLike | undefined) =>
  Array.isArray(node?.isolatedApplicationIds) ||
  Array.isArray(node?.hiddenApplicationIds)

export const getCatalogNodeFilterState = (
  node: CatalogNodeLike | undefined
): CatalogNodeFilterState => ({
  isolatedApplicationIds: Array.isArray(node?.isolatedApplicationIds)
    ? node.isolatedApplicationIds
    : [],
  hiddenApplicationIds: Array.isArray(node?.hiddenApplicationIds)
    ? node.hiddenApplicationIds
    : []
})

/**
 * 解析目录节点应展示的树结构：
 * - 节点自己保存过，则使用它自己保存的树结构
 * - 节点从未保存过，则沿用上一个保存过的节点的树结构，
 *   避免每次选择新的目录节点都要重新隐藏/显示一次树节点
 * - 两者都没有时返回 null，表示保持当前视图不动
 */
export const resolveCatalogNodeFilterState = (
  node: CatalogNodeLike | undefined,
  lastSavedState: CatalogNodeFilterState | null | undefined
): {
  state: CatalogNodeFilterState | null
  inherited: boolean
} => {
  if (hasSavedCatalogNodeFilterState(node)) {
    return { state: getCatalogNodeFilterState(node), inherited: false }
  }

  if (!lastSavedState) return { state: null, inherited: false }

  return { state: lastSavedState, inherited: true }
}

export const mapIdsToApplicationIds = (
  ids: string[],
  dataStore: ReturnType<typeof useFilteringDataStore>
): string[] => {
  const result: string[] = []
  for (const id of ids) {
    let appId: string | undefined
    for (const dataSource of dataStore.dataSources.value) {
      if (dataSource.objectMap[id]?.applicationId) {
        appId = dataSource.objectMap[id].applicationId as string
        break
      }
    }
    result.push(appId || id)
  }
  return result
}

export const mapApplicationIdsToIds = (
  appIds: string[],
  dataStore: ReturnType<typeof useFilteringDataStore>
): string[] => {
  const result: string[] = []
  // Build a fast lookup map for applicationId -> id
  const appToIdMap = new Map<string, string>()
  for (const dataSource of dataStore.dataSources.value) {
    for (const [id, obj] of Object.entries(dataSource.objectMap)) {
      if (obj.applicationId) {
        appToIdMap.set(obj.applicationId as string, id)
      }
    }
  }

  for (const appId of appIds) {
    const id = appToIdMap.get(appId)
    result.push(id || appId)
  }
  return result
}
