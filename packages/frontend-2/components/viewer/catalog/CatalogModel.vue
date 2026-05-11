<template>
  <div class="select-none h-full">
    <ViewerLayoutSidePanel>
      <template #title>
        <span>模型构件树</span>
      </template>
      <template #actions>
        <FormButton class="bg-[#e6f7f8] text-[#00b4b6]" @click="saveTreeToNode">
          保存节点
        </FormButton>
      </template>

      <div class="flex flex-col h-full">
        <template v-if="resourceItems.length || objects.length">
          <div
            class="flex-1 simple-scrollbar overflow-x-hidden"
            data-virtual-list-container
            v-bind="containerProps"
            @scroll="handleScroll"
          >
            <div v-bind="wrapperProps" class="model-list">
              <div
                v-for="{ data: item } in virtualList"
                :key="item.id"
                :data-item-id="item.id"
                :data-item-type="item.type"
                class="group first:hidden"
              >
                <!-- Model Header -->
                <template v-if="item.type === 'model-header'">
                  <div class="bg-foundation h-16 model-header">
                    <ViewerModelsCard
                      :model="getModelFromItem(item)"
                      :version-id="getVersionIdFromItem(item)"
                      :is-expanded="expandedModels.has(item.modelId)"
                      @toggle-expansion="toggleModelExpansion(item.modelId)"
                    />
                  </div>
                </template>

                <!-- Detached Object Header -->
                <template v-else-if="item.type === 'detached-object-header'">
                  <div class="bg-foundation h-16 model-header">
                    <ViewerModelsDetachedObjectHeader
                      :object-id="getObjectIdFromItem(item)"
                      :is-expanded="expandedModels.has(item.modelId)"
                      @toggle-expansion="toggleModelExpansion(item.modelId)"
                    />
                  </div>
                </template>

                <!-- Tree Item -->
                <template v-else-if="item.type === 'tree-item'">
                  <ViewerModelsVirtualTreeItem
                    :item="item"
                    @toggle-expansion="toggleTreeItemExpansion"
                    @item-click="handleItemClick"
                  />
                </template>
              </div>
            </div>
          </div>
        </template>

        <!-- Loading State -->
        <div
          v-else-if="resourcesLoading"
          class="flex items-center justify-center h-full -mt-8 opacity-60"
        >
          <CommonLoadingIcon />
        </div>
      </div>
    </ViewerLayoutSidePanel>
  </div>
</template>

<script setup lang="ts">
import {
  useInjectedViewerLoadedResources,
  useInjectedViewer,
  useInjectedViewerState
} from '~~/lib/viewer/composables/setup'
import { ModelsSubView, type ExplorerNode } from '~~/lib/viewer/helpers/sceneExplorer'
import type { ViewerLoadedResourcesQuery } from '~~/lib/common/generated/gql/graphql'
import type { Get } from 'type-fest'
import { useSelectionUtilities } from '~~/lib/viewer/composables/ui'
import {
  useTreeManagement,
  type UnifiedVirtualItem
} from '~~/lib/viewer/composables/tree'
import { useVirtualList, useDebounceFn, useThrottleFn } from '@vueuse/core'

type ModelItem = NonNullable<Get<ViewerLoadedResourcesQuery, 'project.models.items[0]'>>

const subView = defineModel<ModelsSubView>('subView', { default: ModelsSubView.Main })
const expandedModelId = ref<string | null>(null)

const expandedNodes = ref<Set<string>>(new Set())
const expandedModels = ref<Set<string>>(new Set())
const disableScrollOnNextSelection = ref(false)
const emit = defineEmits(['onSave'])

const stickyHeader = ref<{ model: ModelItem; versionId: string } | null>(null)
const scrollTop = ref(0)

const { resourceItems, modelsAndVersionIds, objects, resourcesLoading } =
  useInjectedViewerLoadedResources()
const {
  metadata: { worldTree }
} = useInjectedViewer()
const {
  resources: {
    response: { resourceItems: stateResourceItems }
  },
  ui: { diff: diffState, filters }
} = useInjectedViewerState()
const {
  objects: selectedObjects,
  addToSelection,
  clearSelection,
  removeFromSelection
} = useSelectionUtilities()
const {
  flattenModelTree,
  getRootNodesForModel,
  findObjectInNodes,
  expandNodesToShowObject,
  treeStateManager
} = useTreeManagement()

const unifiedVirtualItems = computed(() => {
  return treeStateManager.getUnifiedVirtualItems(
    modelsAndVersionIds.value,
    expandedModels.value,
    expandedNodes.value,
    selectedObjects.value,
    worldTree.value || null,
    stateResourceItems.value as { objectId: string; modelId?: string }[],
    objects.value,
    getRootNodesForModel,
    flattenModelTree
  )
})

const {
  list: virtualList,
  containerProps,
  wrapperProps
} = useVirtualList(unifiedVirtualItems, {
  itemHeight: (index) => {
    const item = unifiedVirtualItems.value[index]
    return item?.type === 'model-header' || item?.type === 'detached-object-header'
      ? 64
      : 40
  },
  overscan: 20
})

// Calculate header positions precisely - memoized for performance
const modelHeaderPositions = computed(() => {
  const headers: Array<{
    index: number
    model: ModelItem
    versionId: string
    position: number
  }> = []

  let cumulativeHeight = 0
  for (let i = 0; i < unifiedVirtualItems.value.length; i++) {
    const item = unifiedVirtualItems.value[i]
    const itemHeight =
      item.type === 'model-header' || item.type === 'detached-object-header' ? 64 : 40

    if (item.type === 'model-header') {
      const data = item.data as { model: ModelItem; versionId: string }
      headers.push({
        index: i,
        model: data.model,
        versionId: data.versionId,
        position: cumulativeHeight
      })
    } else if (item.type === 'detached-object-header') {
      const data = item.data as { objectId: string }
      // Create a detached object header item in the virtual list
      const detachedObjectHeader = {
        id: data.objectId,
        name: 'Detached Object',
        displayName: 'Detached Object'
      } as unknown as ModelItem
      headers.push({
        index: i,
        model: detachedObjectHeader,
        versionId: data.objectId,
        position: cumulativeHeight
      })
    }
    cumulativeHeight += itemHeight
  }
  return headers
})

const hasDiffActive = computed(() => {
  return !!(diffState.oldVersion.value && diffState.newVersion.value)
})

const toggleModelExpansion = (modelId: string) => {
  if (expandedModels.value.has(modelId)) {
    expandedModels.value.delete(modelId)
  } else {
    expandedModels.value.add(modelId)
  }
}

const toggleTreeItemExpansion = (itemId: string) => {
  if (expandedNodes.value.has(itemId)) {
    expandedNodes.value.delete(itemId)
  } else {
    expandedNodes.value.add(itemId)
  }
}

const handleItemClick = (
  item: UnifiedVirtualItem,
  event: MouseEvent | KeyboardEvent
) => {
  if (item.type !== 'tree-item') return

  const node = item.data as ExplorerNode
  const speckleData = node.raw
  if (!speckleData?.id) return

  const isCurrentlySelected = selectedObjects.value.find((o) => o.id === speckleData.id)

  if (isCurrentlySelected && !event.shiftKey) {
    if (item.hasChildren && !item.isExpanded) {
      toggleTreeItemExpansion(item.id)
    }
    return
  }

  if (isCurrentlySelected && event.shiftKey) {
    disableScrollOnNextSelection.value = true
    removeFromSelection(speckleData)
    return
  }

  // Disable scroll for this user-initiated selection
  disableScrollOnNextSelection.value = true

  if (!event.shiftKey) clearSelection()
  addToSelection(speckleData)

  if (item.hasChildren && !item.isExpanded) {
    toggleTreeItemExpansion(item.id)
  }
}

const getModelFromItem = (item: UnifiedVirtualItem): ModelItem => {
  if (item.type === 'model-header') {
    return (item.data as { model: ModelItem; versionId: string }).model
  }
  return {} as ModelItem
}

const getVersionIdFromItem = (item: UnifiedVirtualItem): string => {
  if (item.type === 'model-header') {
    return (item.data as { model: ModelItem; versionId: string }).versionId
  }
  return ''
}

const getObjectIdFromItem = (item: UnifiedVirtualItem): string => {
  if (item.type === 'detached-object-header') {
    return (item.data as { objectId: string }).objectId
  }
  return ''
}

const scrollToSelectedItem = (objectId: string) => {
  nextTick(() => {
    const itemIndex = unifiedVirtualItems.value.findIndex(
      (item) =>
        item.type === 'tree-item' && (item.data as ExplorerNode).raw?.id === objectId
    )
    if (itemIndex !== -1) {
      const container = containerProps.ref.value
      if (container) {
        const containerHeight = container.clientHeight
        const itemHeight = 40
        const totalOffset = itemIndex * itemHeight
        const centerOffset = containerHeight / 2 - itemHeight / 2
        const scrollPosition = Math.max(0, totalOffset - centerOffset)

        container.scrollTo({
          top: scrollPosition
        })
      }
    }
  })
}

const handleSelectionChange = useDebounceFn(
  (newSelection: typeof selectedObjects.value) => {
    if (newSelection.length > 0 && !disableScrollOnNextSelection.value) {
      for (const selectedObj of newSelection) {
        for (const { model } of modelsAndVersionIds.value) {
          const modelRootNodes = getRootNodesForModel(
            model.id,
            worldTree.value || null,
            stateResourceItems.value as { objectId: string; modelId?: string }[],
            modelsAndVersionIds.value
          )
          const containsObject = findObjectInNodes(modelRootNodes, selectedObj.id)

          if (containsObject) {
            expandedModels.value.add(model.id)

            const result = expandNodesToShowObject(
              modelRootNodes,
              selectedObj.id,
              model.id,
              expandedNodes.value
            )
            if (result.found && result.nodesToExpand.length > 0) {
              result.nodesToExpand.forEach((nodeId) => expandedNodes.value.add(nodeId))
            }

            scrollToSelectedItem(selectedObj.id)
            break
          }
        }
        break
      }
    }

    disableScrollOnNextSelection.value = false
  },
  100
)

// Simple scroll tracking - just switch headers
const handleScroll = useThrottleFn((e: Event) => {
  const container = e.target as HTMLElement
  if (!container) return

  scrollTop.value = container.scrollTop

  const modelHeaders = modelHeaderPositions.value
  if (modelHeaders.length === 0) return

  // Find the current active header
  let currentHeaderIndex = 0
  for (let i = modelHeaders.length - 1; i >= 0; i--) {
    if (modelHeaders[i].position <= scrollTop.value) {
      currentHeaderIndex = i
      break
    }
  }

  const currentHeader = modelHeaders[currentHeaderIndex]

  // Simply update sticky header
  if (currentHeader) {
    stickyHeader.value = {
      model: currentHeader.model,
      versionId: currentHeader.versionId
    }
  }
}, 16)

watch(selectedObjects, handleSelectionChange, { deep: true })

watch(subView, (newSubView) => {
  if (newSubView === ModelsSubView.Main) {
    expandedModelId.value = null
  }
})

watch(hasDiffActive, (isActive) => {
  if (isActive && subView.value !== ModelsSubView.Diff) {
    subView.value = ModelsSubView.Diff
  }
})

// Initialize and update sticky header when models change
watch(
  unifiedVirtualItems,
  (items) => {
    if (items.length > 0) {
      const firstHeader = items.find(
        (item) => item.type === 'model-header' || item.type === 'detached-object-header'
      )
      if (firstHeader) {
        if (firstHeader.type === 'model-header') {
          const data = firstHeader.data as { model: ModelItem; versionId: string }
          stickyHeader.value = {
            model: data.model,
            versionId: data.versionId
          }
          if (!expandedModels.value.has(data.model.id)) {
            expandedModels.value.add(data.model.id)
          }
        } else if (firstHeader.type === 'detached-object-header') {
          const data = firstHeader.data as { objectId: string }
          const detachedObjectHeader = {
            id: data.objectId,
            name: 'Detached Object',
            displayName: 'Detached Object'
          } as unknown as ModelItem
          stickyHeader.value = {
            model: detachedObjectHeader,
            versionId: data.objectId
          }
        }
      }
    } else {
      stickyHeader.value = null
    }
  },
  { immediate: true }
)
import { mapIdsToApplicationIds } from '~~/lib/viewer/helpers/catalogHelpers'
import { useFilteringDataStore } from '~~/lib/viewer/composables/filtering/dataStore'

const dataStore = useFilteringDataStore()

const saveTreeToNode = () => {
  const isolatedApplicationIds = mapIdsToApplicationIds(filters.isolatedObjectIds.value, dataStore)
  const hiddenApplicationIds = mapIdsToApplicationIds(filters.hiddenObjectIds.value, dataStore)
  emit('onSave', {
    isolatedApplicationIds,
    hiddenApplicationIds
  })
}
</script>

<style scoped>
/* Add border-top to model/detached object headers that follow tree items using css */
.model-list
  .group[data-item-type='tree-item']
  + .group[data-item-type='model-header']
  .model-header,
.model-list
  .group[data-item-type='tree-item']
  + .group[data-item-type='detached-object-header']
  .model-header {
  @apply border-t border-outline-3;
}
</style>
