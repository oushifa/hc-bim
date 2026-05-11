import type { useFilteringDataStore } from '~/lib/viewer/composables/filtering/dataStore'

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
