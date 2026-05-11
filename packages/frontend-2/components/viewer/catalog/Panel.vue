<template>
  <ViewerLayoutSidePanel disable-scrollbar class="relative" @close="$emit('close')">
    <template #title>
      <div class="flex justify-between items-center">
        <div>目录组织</div>
      </div>
    </template>
    <template #actions>
      <div class="flex items-center gap-0.5">
        <div v-tippy="canCreateViewOrGroup?.errorMessage" class="flex items-center gap-1">
          <FormButton
            v-tippy="getTooltipProps('创建目录')"
            size="sm"
            color="subtle"
            :icon-left="Plus"
            hide-text
            name="addCatalog"
            :disabled="isSaving"
            @click="openCreateCatalogDialog"
          />
          <FormButton
            v-tippy="getTooltipProps('删除当前目录')"
            size="sm"
            color="danger"
            :icon-left="Trash"
            hide-text
            name="deleteCatalog"
            :disabled="!activeCatalogId || isSaving"
            @click="onDeleteCatalog"
          />
        </div>
      </div>
    </template>
    <template v-if="searchMode" #fullTitle>
      <div class="self-center w-full pr-1 flex gap-2 items-center">
        <FormTextInput
          v-bind="bind"
          name="search"
          placeholder="搜索视图..."
          color="foundation"
          auto-focus
          size="sm"
          wrapper-classes="flex-1 -ml-1"
          v-on="on"
        />
        <FormButton
          size="sm"
          color="subtle"
          :icon-left="X"
          hide-text
          name="disableSearch"
          @click="setSearchMode(false)"
        />
      </div>
    </template>
    <div class="p-1 flex overflow-hidden items-start">
      <div class="flex-grow overflow-auto">
        <LayoutTabsHorizontal
          v-model:active-item="activeCatalogItem"
          :items="catalogs"
        ></LayoutTabsHorizontal>
      </div>
      <div class="flex-shrink-0">
        <FormButton
          v-tippy="getTooltipProps('创建根节点')"
          size="sm"
          color="subtle"
          :icon-left="Plus"
          hide-text
          name="addRootNode"
          :disabled="isSaving"
          @click="openCreateRootNodeDialog"
        />
      </div>
    </div>
    <div
      ref="groupsScrollArea"
      class="text-body-sm flex-1 min-h-0 flex flex-col gap-2 p-1"
    >
      <div
        class="h-1/2 min-h-0 overflow-y-auto simple-scrollbar rounded border border-outline-3"
      >
        <div
          class="px-2 py-1 text-body-2xs text-foreground-2 border-b border-outline-3"
        >
          目录节点
        </div>
        <div class="p-1">
          <LayoutTree
            :key="activeCatalogId"
            v-model:selected-keys="selectedTreeKeys"
            :tree-data="activeTreeData"
            default-expand-all
          >
            <template #title="{ node, selected }">
              <div class="flex items-center justify-between w-full h-full pr-1">
                <span class="truncate" :title="node.title">{{ node.title }}</span>
                <div 
                  class="flex items-center gap-0.5 transition-opacity duration-150 opacity-0 group-hover:opacity-100"
                  :class="{ 'opacity-100': selected }"
                >
                  <button 
                    type="button"
                    class="p-1 rounded-sm text-foreground-2 hover:text-[#00b4b6] hover:bg-[#e6f7f8] transition-colors"
                    title="添加子节点"
                    :disabled="isSaving"
                    @click.stop="openCreateChildNodeDialog(node.key)"
                  >
                    <Plus class="w-3.5 h-3.5" />
                  </button>
                  <button 
                    type="button"
                    class="p-1 rounded-sm text-foreground-2 hover:text-danger hover:bg-danger-muted transition-colors"
                    title="删除节点"
                    :disabled="isSaving"
                    @click.stop="onDeleteSpecificNode(node.key)"
                  >
                    <Trash class="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </template>
          </LayoutTree>
        </div>
      </div>
      <div
        class="h-1/2 min-h-0 overflow-y-auto simple-scrollbar rounded border border-outline-3"
      >
        <div class="h-[calc(100%-29px)]">
          <CatalogModel class="h-full" @on-save="saveToNode" />
        </div>
      </div>
    </div>

    <LayoutDialog
      v-model:open="showCreateCatalogDialog"
      max-width="sm"
      :buttons="createCatalogDialogButtons"
    >
      <template #header>创建目录</template>
      <div class="space-y-2">
        <div class="text-body-xs text-foreground-2">请输入目录名称</div>
        <FormTextInput
          v-model="newCatalogName"
          name="catalogName"
          placeholder="例如：目录3"
          color="foundation"
        />
      </div>
    </LayoutDialog>

    <LayoutDialog
      v-model:open="showCreateNodeDialog"
      max-width="sm"
      :buttons="createNodeDialogButtons"
    >
      <template #header>创建节点</template>
      <div class="space-y-2">
        <div class="text-body-xs text-foreground-2">请输入节点名称</div>
        <FormTextInput
          v-model="newNodeName"
          name="nodeName"
          placeholder="例如：节点1"
          color="foundation"
        />
      </div>
    </LayoutDialog>
  </ViewerLayoutSidePanel>
</template>
<script setup lang="ts">
import { Plus, X, Trash } from 'lucide-vue-next'
import { graphql } from '~/lib/common/generated/gql'
import { useInjectedViewerState } from '~/lib/viewer/composables/setup'
import { useDebouncedTextInput } from '@speckle/ui-components'
import { useKeepAliveScrollState } from '~/lib/common/composables/dom'
import { useFilterUtilities } from '~/lib/viewer/composables/filtering/filtering'
import { useGlobalToast } from '~/lib/common/composables/toast'
import type { LayoutDialogButton, LayoutPageTabItem } from '@speckle/ui-components'
import { LayoutTabsHorizontal } from '#components'
import CatalogModel from './CatalogModel.vue'
import { useViewerCatalogs, type ViewerCatalogNode } from '~/lib/viewer/composables/catalog'
import { mapApplicationIdsToIds } from '~/lib/viewer/helpers/catalogHelpers'
import { useFilteringDataStore } from '~~/lib/viewer/composables/filtering/dataStore'

graphql(`
  fragment ViewerSavedViewsPanel_Project on Project {
    id
    permissions {
      canCreateSavedView {
        ...FullPermissionCheckResult
      }
    }
    workspace {
      id
      seatType
      planSupportsSavedViews: hasAccessToFeature(featureName: savedViews)
    }
  }
`)

defineEmits<{
  close: []
}>()

const {
  resources: {
    response: { project }
  }
} = useInjectedViewerState()
const { on, bind, value: search } = useDebouncedTextInput()
const { isolateObjects, hideObjects, resetHiddenAndIsolations } = useFilterUtilities()
const { fetchCatalogs, createCatalog, updateCatalog, deleteCatalog } = useViewerCatalogs()
const { triggerNotification } = useGlobalToast()
const dataStore = useFilteringDataStore()
const projectId = computed(() => project.value?.id)

const isSaving = ref(false)

type RawCatalogNode = {
  title: string
  id: string
  isolatedApplicationIds?: string[]
  hiddenApplicationIds?: string[]
  childrens?: RawCatalogNode[]
}

type CatalogTreeNode = {
  key: string
  title: string
  children?: CatalogTreeNode[]
}

type CatalogTabItem = LayoutPageTabItem & {
  childrens?: RawCatalogNode[]
}

const catalogs = ref<CatalogTabItem[]>([])
const activeCatalogItem = ref<any>(undefined)

onMounted(async () => {
  if (projectId.value) {
    try {
      const fetched = await fetchCatalogs(projectId.value)
      catalogs.value = fetched.map((c) => ({
        title: c.title,
        id: c.id,
        childrens: c.treeData as RawCatalogNode[]
      }))
      if (catalogs.value.length > 0) {
        activeCatalogItem.value = catalogs.value[0]
      }
    } catch (e) {
      console.error('Failed to load catalogs', e)
    }
  }
})

const saveToNode = async ({
  isolatedApplicationIds,
  hiddenApplicationIds
}: {
  isolatedApplicationIds: string[]
  hiddenApplicationIds: string[]
}) => {
  const targetNodeId = selectedTreeNodeId.value
  const currentCatalogId = activeCatalogId.value
  if (!targetNodeId || !currentCatalogId || !projectId.value || isSaving.value) return

  const catalogIndex = catalogs.value.findIndex(
    (item) => item.id === currentCatalogId
  )
  if (catalogIndex < 0) return

  isSaving.value = true
  const currentCatalog = catalogs.value[catalogIndex]
  const existingChildren = Array.isArray(currentCatalog.childrens) ? currentCatalog.childrens : []
  const updateNodeById = (
    nodes: RawCatalogNode[],
    nodeId: string
  ): { updatedNodes: RawCatalogNode[]; updated: boolean } => {
    let updated = false
    const updatedNodes = nodes.map((node) => {
      if (node.id === nodeId) {
        updated = true
        return {
          ...node,
          isolatedApplicationIds,
          hiddenApplicationIds
        }
      }

      const children = node.childrens || []
      if (!children.length) return node

      const childResult = updateNodeById(children, nodeId)
      if (!childResult.updated) return node

      updated = true
      return {
        ...node,
        childrens: childResult.updatedNodes
      }
    })

    return { updatedNodes, updated }
  }

  const result = updateNodeById(existingChildren, targetNodeId)
  if (!result.updated) {
    isSaving.value = false
    return
  }

  try {
    await updateCatalog(projectId.value, currentCatalogId, {
      treeData: result.updatedNodes as ViewerCatalogNode[]
    })

    const updatedCatalog: CatalogTabItem = {
      ...currentCatalog,
      childrens: result.updatedNodes
    }

    const nextCatalogs = [...catalogs.value]
    nextCatalogs.splice(catalogIndex, 1, updatedCatalog)
    catalogs.value = nextCatalogs
    activeCatalogItem.value = updatedCatalog
    triggerNotification({
      type: 'success',
      title: '视图状态保存成功'
    })
  } catch (e: any) {
    console.error('Failed to update catalog node', e)
    triggerNotification({
      type: 'error',
      title: '保存失败',
      description: e.message || '网络连接错误'
    })
  } finally {
    isSaving.value = false
  }
}

const activeCatalogId = computed(
  () => activeCatalogItem.value?.id || catalogs.value[0]?.id
)

const mapCatalogChildrenToTreeNodes = (nodes: RawCatalogNode[]): CatalogTreeNode[] => {
  if (!Array.isArray(nodes)) return []
  return nodes.map((node) => ({
    key: node.id,
    title: node.title,
    children: Array.isArray(node.childrens) && node.childrens.length
      ? mapCatalogChildrenToTreeNodes(node.childrens)
      : undefined
  }))
}

const activeTreeData = computed<CatalogTreeNode[]>(() => {
  const children =
    catalogs.value.find((item) => item.id === activeCatalogId.value)?.childrens || []
  return mapCatalogChildrenToTreeNodes(children)
})

const searchMode = ref(false)
const showCreateCatalogDialog = ref(false)
const showCreateNodeDialog = ref(false)
const newCatalogName = ref('')
const newNodeName = ref('')
const selectedTreeKeys = ref<string[]>([])
const selectedTreeNodeId = computed(() => selectedTreeKeys.value[0])

const findNodeById = (
  nodes: RawCatalogNode[],
  nodeId: string
): RawCatalogNode | undefined => {
  for (const node of nodes) {
    if (node.id === nodeId) return node
    const children = node.childrens || []
    if (!children.length) continue

    const found = findNodeById(children, nodeId)
    if (found) return found
  }

  return undefined
}

const applyNodeFilters = (node: RawCatalogNode) => {
  resetHiddenAndIsolations()
  nextTick(() => {
    const isolatedObjectIds = mapApplicationIdsToIds(node.isolatedApplicationIds || [], dataStore)
    const hiddenObjectIds = mapApplicationIdsToIds(node.hiddenApplicationIds || [], dataStore)
    isolateObjects(isolatedObjectIds, { replace: true })
    hideObjects(hiddenObjectIds, { replace: true })
  })
}

watch(selectedTreeNodeId, (nodeId) => {
  const currentCatalogId = activeCatalogId.value
  if (!nodeId || !currentCatalogId) return

  const currentCatalog = catalogs.value.find((item) => item.id === currentCatalogId)
  const selectedNode = findNodeById(currentCatalog?.childrens || [], nodeId)
  if (!selectedNode) return

  applyNodeFilters(selectedNode)
})

const { getTooltipProps } = useSmartTooltipDelay()
useKeepAliveScrollState(useTemplateRef('groupsScrollArea'))

const canCreateViewOrGroup = computed(
  () => project.value?.permissions.canCreateSavedView
)
const createCatalogDialogButtons = computed((): LayoutDialogButton[] => [
  {
    text: '取消',
    props: { color: 'outline' },
    onClick: () => {
      showCreateCatalogDialog.value = false
    }
  },
  {
    text: '创建',
    disabled: !newCatalogName.value.trim(),
    onClick: () => {
      onAddCatalog()
    }
  }
])

const createNodeDialogButtons = computed((): LayoutDialogButton[] => [
  {
    text: '取消',
    props: { color: 'outline' },
    onClick: () => {
      showCreateNodeDialog.value = false
    }
  },
  {
    text: '创建',
    disabled: !newNodeName.value.trim(),
    onClick: () => {
      onAddNode()
    }
  }
])

const openCreateCatalogDialog = () => {
  newCatalogName.value = ''
  showCreateCatalogDialog.value = true
}

const targetParentNodeId = ref<string | undefined>(undefined)

const openCreateRootNodeDialog = () => {
  targetParentNodeId.value = undefined
  newNodeName.value = ''
  showCreateNodeDialog.value = true
}

const openCreateChildNodeDialog = (parentId: string) => {
  targetParentNodeId.value = parentId
  newNodeName.value = ''
  showCreateNodeDialog.value = true
}

const onAddCatalog = async () => {
  const title = newCatalogName.value.trim()
  if (!title || !projectId.value || isSaving.value) return

  try {
    isSaving.value = true
    const newCatalog = await createCatalog(projectId.value, title, [])
    const nextCatalog: CatalogTabItem = {
      id: newCatalog.id,
      title: newCatalog.title,
      childrens: []
    }

    catalogs.value = [...catalogs.value, nextCatalog]
    activeCatalogItem.value = nextCatalog
    showCreateCatalogDialog.value = false
    triggerNotification({
      type: 'success',
      title: '目录创建成功'
    })
  } catch (e: any) {
    console.error('Failed to create catalog', e)
    triggerNotification({
      type: 'error',
      title: '目录创建失败',
      description: e.message || '请检查网络连接'
    })
  } finally {
    isSaving.value = false
  }
}

const onAddNode = async () => {
  const title = newNodeName.value.trim()
  if (!title || !projectId.value || isSaving.value) return

  const currentCatalogId = activeCatalogId.value
  if (!currentCatalogId) return

  const catalogIndex = catalogs.value.findIndex(
    (item) => item.id === currentCatalogId
  )
  if (catalogIndex < 0) return

  isSaving.value = true

  const currentCatalog = catalogs.value[catalogIndex]
  const existingChildren = Array.isArray(currentCatalog.childrens) ? currentCatalog.childrens : []

  const nextNode: RawCatalogNode = {
    id: `${currentCatalogId}-node-${Date.now()}`,
    title,
    childrens: []
  }

  const targetNodeId = targetParentNodeId.value
  let updatedNodes: RawCatalogNode[]

  if (!targetNodeId) {
    // Add as root node
    updatedNodes = [...existingChildren, nextNode]
  } else {
    // Add as child node of targetNodeId
    const insertNodeUnderTarget = (
      nodes: RawCatalogNode[],
      parentId: string,
      node: RawCatalogNode
    ): { updatedNodes: RawCatalogNode[]; inserted: boolean } => {
      let inserted = false
      const mappedNodes = nodes.map((item) => {
        if (item.id === parentId) {
          inserted = true
          return {
            ...item,
            childrens: [...(item.childrens || []), node]
          }
        }

        const children = item.childrens || []
        if (!children.length) return item

        const childResult = insertNodeUnderTarget(children, parentId, node)
        if (!childResult.inserted) return item

        inserted = true
        return {
          ...item,
          childrens: childResult.updatedNodes
        }
      })

      return { updatedNodes: mappedNodes, inserted }
    }

    const insertionResult = insertNodeUnderTarget(
      existingChildren,
      targetNodeId,
      nextNode
    )
    
    if (!insertionResult.inserted) return
    updatedNodes = insertionResult.updatedNodes
  }

  try {
    await updateCatalog(projectId.value, currentCatalogId, {
      treeData: updatedNodes as ViewerCatalogNode[]
    })

    const updatedCatalog: CatalogTabItem = {
      ...currentCatalog,
      childrens: updatedNodes
    }

    const nextCatalogs = [...catalogs.value]
    nextCatalogs.splice(catalogIndex, 1, updatedCatalog)
    catalogs.value = nextCatalogs
    activeCatalogItem.value = updatedCatalog
    showCreateNodeDialog.value = false
    
    // Automatically select the new node or expand parents
    selectedTreeKeys.value = [nextNode.id]
    
    triggerNotification({
      type: 'success',
      title: '节点创建成功'
    })
  } catch (e: any) {
    console.error('Failed to add catalog node', e)
    triggerNotification({
      type: 'error',
      title: '节点创建失败',
      description: e.message || '网络或服务器错误'
    })
  } finally {
    isSaving.value = false
  }
}

const onDeleteCatalog = async () => {
  const currentCatalogId = activeCatalogId.value
  if (!currentCatalogId || !projectId.value || isSaving.value) return

  if (!window.confirm('确认要删除当前目录吗？此操作不可撤销。')) return

  try {
    isSaving.value = true
    await deleteCatalog(projectId.value, currentCatalogId)

    catalogs.value = catalogs.value.filter((c) => c.id !== currentCatalogId)
    if (catalogs.value.length > 0) {
      activeCatalogItem.value = catalogs.value[0]
    } else {
      activeCatalogItem.value = undefined
    }

    triggerNotification({
      type: 'success',
      title: '目录已删除'
    })
  } catch (e: any) {
    console.error('Failed to delete catalog', e)
    triggerNotification({
      type: 'error',
      title: '删除目录失败',
      description: e.message || '网络或服务器错误'
    })
  } finally {
    isSaving.value = false
  }
}

const onDeleteSpecificNode = async (nodeId: string) => {
  const currentCatalogId = activeCatalogId.value
  if (!currentCatalogId || !nodeId || !projectId.value || isSaving.value) return

  if (!window.confirm('确认要删除选中的节点及其所有子节点吗？此操作不可撤销。')) return

  const catalogIndex = catalogs.value.findIndex(
    (item) => item.id === currentCatalogId
  )
  if (catalogIndex < 0) return

  isSaving.value = true

  const currentCatalog = catalogs.value[catalogIndex]
  const existingChildren = Array.isArray(currentCatalog.childrens)
    ? currentCatalog.childrens
    : []

  const removeNodeById = (
    nodes: RawCatalogNode[],
    idToRemove: string
  ): { updatedNodes: RawCatalogNode[]; removed: boolean } => {
    let removed = false
    const updatedNodes = nodes
      .filter((n) => {
        if (n.id === idToRemove) {
          removed = true
          return false
        }
        return true
      })
      .map((n) => {
        if (!n.childrens || !n.childrens.length) return n
        const childResult = removeNodeById(n.childrens, idToRemove)
        if (childResult.removed) {
          removed = true
          return { ...n, childrens: childResult.updatedNodes }
        }
        return n
      })

    return { updatedNodes, removed }
  }

  const result = removeNodeById(existingChildren, nodeId)
  if (!result.removed) {
    isSaving.value = false
    return
  }

  try {
    await updateCatalog(projectId.value, currentCatalogId, {
      treeData: result.updatedNodes as ViewerCatalogNode[]
    })

    const updatedCatalog: CatalogTabItem = {
      ...currentCatalog,
      childrens: result.updatedNodes
    }

    const nextCatalogs = [...catalogs.value]
    nextCatalogs.splice(catalogIndex, 1, updatedCatalog)
    catalogs.value = nextCatalogs
    activeCatalogItem.value = updatedCatalog

    if (selectedTreeNodeId.value === nodeId) {
      selectedTreeKeys.value = []
    }

    triggerNotification({
      type: 'success',
      title: '节点已删除'
    })
  } catch (e: any) {
    console.error('Failed to delete catalog node', e)
    triggerNotification({
      type: 'error',
      title: '删除节点失败',
      description: e.message || '网络或服务器错误'
    })
  } finally {
    isSaving.value = false
  }
}

const setSearchMode = (val: boolean) => {
  if (val) {
    searchMode.value = true
  } else {
    searchMode.value = false
  }

  search.value = ''
}
</script>
