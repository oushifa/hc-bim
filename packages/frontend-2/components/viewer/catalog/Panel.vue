<template>
  <ViewerLayoutSidePanel disable-scrollbar class="relative" @close="$emit('close')">
    <template #title>
      <div class="flex justify-between items-center">
        <div>目录组织</div>
      </div>
    </template>
    <template #actions>
      <div class="flex items-center gap-0.5">
        <div v-tippy="canCreateViewOrGroup?.errorMessage" class="flex items-center">
          <FormButton
            v-tippy="getTooltipProps('创建目录')"
            size="sm"
            color="subtle"
            :icon-left="Plus"
            hide-text
            name="addCatalog"
            @click="openCreateCatalogDialog"
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
          :items="mockCatalog"
        ></LayoutTabsHorizontal>
      </div>
      <div class="flex-shrink-0">
        <FormButton
          v-tippy="getTooltipProps('创建节点')"
          size="sm"
          color="subtle"
          :icon-left="Plus"
          hide-text
          name="addNode"
          :disabled="!selectedTreeNodeId"
          @click="openCreateNodeDialog"
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
          />
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
import { Plus, X } from 'lucide-vue-next'
import { graphql } from '~/lib/common/generated/gql'
import { useInjectedViewerState } from '~/lib/viewer/composables/setup'
import { useDebouncedTextInput } from '@speckle/ui-components'
import { useKeepAliveScrollState } from '~/lib/common/composables/dom'
import { useFilterUtilities } from '~/lib/viewer/composables/filtering/filtering'
import type { LayoutDialogButton, LayoutPageTabItem } from '@speckle/ui-components'
import { LayoutTabsHorizontal } from '#components'
import CatalogModel from './CatalogModel.vue'

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

type RawCatalogNode = {
  title: string
  id: string
  isolatedObjectIds?: string[]
  hiddenObjectIds?: string[]
  childrens?: RawCatalogNode[]
}

type CatalogTreeNode = {
  key: string
  title: string
  children?: CatalogTreeNode[]
}

type CatalogTabItem = LayoutPageTabItem & {
  isolatedObjectIds?: string[]
  hiddenObjectIds?: string[]
  childrens?: RawCatalogNode[]
}

const mockCatalog = ref<CatalogTabItem[]>([
  {
    title: '目录1',
    id: '1',
    isolatedObjectIds: [],
    hiddenObjectIds: [],
    childrens: [
      {
        title: '根节点1',
        id: '1-1',
        isolatedObjectIds: [],
        hiddenObjectIds: [],
        childrens: [
          {
            title: '子节点11',
            id: '1-1-1',
            isolatedObjectIds: [],
            hiddenObjectIds: []
          }
        ]
      }
    ]
  },
  {
    title: '目录2',
    id: '2',
    isolatedObjectIds: [],
    hiddenObjectIds: [],
    childrens: [
      {
        title: '根节点2',
        id: '2-1',
        isolatedObjectIds: [],
        hiddenObjectIds: [],
        childrens: [
          {
            title: '子节点21',
            id: '2-1-1',
            isolatedObjectIds: [],
            hiddenObjectIds: []
          }
        ]
      }
    ]
  }
])

const saveToNode = ({
  isolatedObjectIds,
  hiddenObjectIds
}: {
  isolatedObjectIds: string[]
  hiddenObjectIds: string[]
}) => {
  const targetNodeId = selectedTreeNodeId.value
  const currentCatalogId = activeCatalogId.value
  if (!targetNodeId || !currentCatalogId) return

  const catalogIndex = mockCatalog.value.findIndex(
    (item) => item.id === currentCatalogId
  )
  if (catalogIndex < 0) return

  const currentCatalog = mockCatalog.value[catalogIndex]
  const existingChildren = currentCatalog.childrens || []
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
          isolatedObjectIds,
          hiddenObjectIds
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
  if (!result.updated) return

  const updatedCatalog: CatalogTabItem = {
    ...currentCatalog,
    childrens: result.updatedNodes
  }

  const nextCatalogs = [...mockCatalog.value]
  nextCatalogs.splice(catalogIndex, 1, updatedCatalog)
  mockCatalog.value = nextCatalogs
  activeCatalogItem.value = updatedCatalog
}

const activeCatalogItem = ref<CatalogTabItem>(mockCatalog.value[0])
const activeCatalogId = computed(
  () => activeCatalogItem.value?.id || mockCatalog.value[0]?.id
)

const mapCatalogChildrenToTreeNodes = (nodes: RawCatalogNode[]): CatalogTreeNode[] => {
  return nodes.map((node) => ({
    key: node.id,
    title: node.title,
    children: node.childrens?.length
      ? mapCatalogChildrenToTreeNodes(node.childrens)
      : undefined
  }))
}

const activeTreeData = computed<CatalogTreeNode[]>(() => {
  const children =
    mockCatalog.value.find((item) => item.id === activeCatalogId.value)?.childrens || []
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
    isolateObjects(node.isolatedObjectIds || [], { replace: true })
    hideObjects(node.hiddenObjectIds || [], { replace: true })
  })
}

watch(selectedTreeNodeId, (nodeId) => {
  const currentCatalogId = activeCatalogId.value
  if (!nodeId || !currentCatalogId) return

  const currentCatalog = mockCatalog.value.find((item) => item.id === currentCatalogId)
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

const openCreateNodeDialog = () => {
  if (!selectedTreeNodeId.value) return
  newNodeName.value = ''
  showCreateNodeDialog.value = true
}

const onAddCatalog = () => {
  const title = newCatalogName.value.trim()
  if (!title) return

  const nextCatalog: CatalogTabItem = {
    id: `catalog-${Date.now()}`,
    title,
    childrens: []
  }

  mockCatalog.value = [...mockCatalog.value, nextCatalog]
  activeCatalogItem.value = nextCatalog
  showCreateCatalogDialog.value = false
}

const onAddNode = () => {
  const title = newNodeName.value.trim()
  if (!title) return

  const targetNodeId = selectedTreeNodeId.value
  if (!targetNodeId) return

  const currentCatalogId = activeCatalogId.value
  if (!currentCatalogId) return

  const catalogIndex = mockCatalog.value.findIndex(
    (item) => item.id === currentCatalogId
  )
  if (catalogIndex < 0) return

  const currentCatalog = mockCatalog.value[catalogIndex]
  const existingChildren = currentCatalog.childrens || []

  const nextNode: RawCatalogNode = {
    id: `${currentCatalogId}-node-${Date.now()}`,
    title,
    childrens: []
  }

  const insertNodeUnderTarget = (
    nodes: RawCatalogNode[],
    parentId: string,
    node: RawCatalogNode
  ): { updatedNodes: RawCatalogNode[]; inserted: boolean } => {
    let inserted = false
    const updatedNodes = nodes.map((item) => {
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

    return { updatedNodes, inserted }
  }

  const insertionResult = insertNodeUnderTarget(
    existingChildren,
    targetNodeId,
    nextNode
  )
  if (!insertionResult.inserted) return

  const updatedCatalog: CatalogTabItem = {
    ...currentCatalog,
    childrens: insertionResult.updatedNodes
  }

  const nextCatalogs = [...mockCatalog.value]
  nextCatalogs.splice(catalogIndex, 1, updatedCatalog)
  mockCatalog.value = nextCatalogs
  activeCatalogItem.value = updatedCatalog
  showCreateNodeDialog.value = false
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
