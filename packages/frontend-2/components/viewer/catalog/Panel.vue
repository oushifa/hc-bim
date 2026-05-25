<template>
  <ViewerLayoutSidePanel disable-scrollbar class="relative" @close="$emit('close')">
    <template #title>
      <div class="flex justify-between items-center">
        <div>目录组织</div>
      </div>
    </template>
    <template #actions>
      <FormButton
        v-tippy="getTooltipProps('同步目录')"
        size="sm"
        :icon-left="RefreshCcw"
        hide-text
        name="deleteCatalog"
        :disabled="!activeCatalogId || !currentModelId || isSaving"
        @click="onSyncCatalog"
      />
    </template>
    <div class="p-1 flex overflow-hidden items-start">
      <div class="flex-grow overflow-auto">
        <div v-if="catalogs.length" class="flex items-center gap-1">
          <div class="flex items-center gap-0.5">
            <template v-for="catalog in catalogs" :key="catalog.id">
              <button
                type="button"
                class="px-3 py-1.5 text-body-xs rounded transition-colors whitespace-nowrap"
                :class="
                  activeCatalogId === catalog.id
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-foreground-2 hover:bg-bg-2'
                "
                @click="activeCatalogItem = catalog"
              >
                {{ catalog.title }}
              </button>
              <!-- 每个Tab的三点菜单 -->
              <div
                :ref="(el) => setTabMenuRef(el, catalog.id)"
                class="relative flex-shrink-0"
              >
                <button
                  type="button"
                  class="p-1 rounded hover:bg-bg-2 text-foreground-2 hover:text-foreground-1 transition-colors"
                  @click.stop="toggleTabMenu(catalog.id)"
                >
                  <EllipsisHorizontalIcon class="w-4 h-4" />
                </button>
              </div>
            </template>
          </div>
        </div>
      </div>
      <div class="flex-shrink-0">
        <div class="flex items-center gap-0.5">
          <div
            v-tippy="canCreateViewOrGroup?.errorMessage"
            class="flex items-center gap-1"
          >
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
          </div>
        </div>
      </div>
    </div>

    <!-- 下拉菜单 - 使用Teleport渲染到body避免被overflow裁剪 -->
    <Teleport to="body">
      <template v-for="catalog in catalogs" :key="catalog.id">
        <div
          v-if="activeTabMenuId === catalog.id"
          class="fixed w-40 bg-foundation border border-outline-3 rounded shadow-lg z-[9999]"
          :style="getMenuPosition(catalog.id)"
        >
          <button
            type="button"
            class="w-full px-3 py-2 text-left text-body-xs hover:bg-bg-2 flex items-center gap-2 transition-colors"
            @click="openRenameCatalogDialogFor(catalog.id)"
          >
            <PencilIcon class="w-3.5 h-3.5" />
            <span>重命名</span>
          </button>
          <button
            type="button"
            class="w-full px-3 py-2 text-left text-body-xs hover:bg-bg-2 text-danger flex items-center gap-2 transition-colors"
            @click="onDeleteCatalogFor(catalog.id)"
          >
            <Trash class="w-3.5 h-3.5" />
            <span>删除</span>
          </button>
        </div>
      </template>
    </Teleport>

    <div
      ref="groupsScrollArea"
      class="text-body-sm flex-1 min-h-0 flex flex-col gap-2 p-1"
    >
      <div
        class="h-1/2 min-h-0 overflow-y-auto simple-scrollbar rounded border border-outline-3"
      >
        <div
          class="px-2 py-1 text-body-2xs text-foreground-2 border-b border-outline-3 flex items-center justify-between"
        >
          目录节点
          <FormButton
            v-if="activeCatalogId"
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
                    class="p-1 rounded-sm text-foreground-2 hover:text-primary hover:bg-foundation-page transition-colors"
                    title="编辑节点"
                    :disabled="isSaving"
                    @click.stop="openEditNodeDialog(String(node.key))"
                  >
                    <PencilIcon class="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    class="p-1 rounded-sm text-foreground-2 hover:text-warning hover:bg-warning-muted transition-colors"
                    :title="getNodeLockButtonTitle(node)"
                    :disabled="isSaving"
                    @click.stop="
                      onToggleNodeLocked(String(node.key), !isTreeNodeLocked(node))
                    "
                  >
                    <Lock v-if="isTreeNodeLocked(node)" class="w-3.5 h-3.5" />
                    <LockOpen v-else class="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    class="p-1 rounded-sm text-foreground-2 hover:text-[#00b4b6] hover:bg-[#e6f7f8] transition-colors"
                    title="添加子节点"
                    :disabled="isSaving"
                    @click.stop="openCreateChildNodeDialog(String(node.key))"
                  >
                    <Plus class="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    class="p-1 rounded-sm text-foreground-2 hover:text-danger hover:bg-danger-muted transition-colors"
                    title="删除节点"
                    :disabled="isSaving"
                    @click.stop="onDeleteSpecificNode(String(node.key))"
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
      :buttons="catalogDialogButtons"
    >
      <template #header>{{ catalogDialogTitle }}</template>
      <div class="space-y-2">
        <div class="text-body-xs text-foreground-2">请输入目录名称</div>
        <FormTextInput
          v-model="newCatalogName"
          name="catalogName"
          placeholder="目录名称"
          color="foundation"
        />
      </div>
    </LayoutDialog>

    <LayoutDialog
      v-model:open="showRenameCatalogDialog"
      max-width="sm"
      :buttons="renameCatalogDialogButtons"
    >
      <template #header>重命名目录</template>
      <div class="space-y-2">
        <div class="text-body-xs text-foreground-2">请输入新的目录名称</div>
        <FormTextInput
          v-model="renameCatalogName"
          name="renameCatalogName"
          placeholder="目录名称"
          color="foundation"
        />
      </div>
    </LayoutDialog>

    <LayoutDialog
      v-model:open="showCreateNodeDialog"
      max-width="sm"
      :buttons="nodeDialogButtons"
    >
      <template #header>{{ nodeDialogTitle }}</template>
      <div class="space-y-2">
        <div class="text-body-xs text-foreground-2">请输入节点名称</div>
        <FormTextInput
          v-model="newNodeName"
          name="nodeName"
          placeholder="节点名称"
          color="foundation"
        />
      </div>
    </LayoutDialog>
  </ViewerLayoutSidePanel>
</template>
<script setup lang="ts">
import { Plus, Trash, RefreshCcw, PencilIcon, Lock, LockOpen } from 'lucide-vue-next'
import { EllipsisHorizontalIcon } from '@heroicons/vue/24/outline'
import { graphql } from '~/lib/common/generated/gql'
import type { ComponentPublicInstance } from 'vue'
import {
  useInjectedViewerState,
  useInjectedViewerLoadedResources
} from '~/lib/viewer/composables/setup'
import { useKeepAliveScrollState } from '~/lib/common/composables/dom'
import { useFilterUtilities } from '~/lib/viewer/composables/filtering/filtering'
import { ToastNotificationType, useGlobalToast } from '~/lib/common/composables/toast'
import type { LayoutDialogButton, LayoutPageTabItem } from '@speckle/ui-components'
import CatalogModel from './CatalogModel.vue'
import {
  useViewerCatalogs,
  type ViewerCatalogNode
} from '~/lib/viewer/composables/catalog'
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
  },
  viewer: {
    metadata: { worldTree }
  }
} = useInjectedViewerState()
const { isolateObjects, hideObjects, resetHiddenAndIsolations } = useFilterUtilities()
const { fetchCatalogs, createCatalog, updateCatalog, deleteCatalog } =
  useViewerCatalogs()
const { triggerNotification } = useGlobalToast()
const dataStore = useFilteringDataStore()
const { modelsAndVersionIds } = useInjectedViewerLoadedResources()
const projectId = computed(() => project.value?.id)
const currentModelId = computed(() => modelsAndVersionIds.value[0]?.model.id?.trim())
const scopedLoadedModel = computed(() => {
  const modelId = currentModelId.value
  if (!modelId) return undefined

  return modelsAndVersionIds.value.find(({ model }) => model.id === modelId)
})
const { $dtpFetch } = useNuxtApp()

const isSaving = ref(false)

type RawCatalogNode = {
  title: string
  id: string
  locked?: boolean
  isolatedApplicationIds?: string[]
  hiddenApplicationIds?: string[]
  childrens?: RawCatalogNode[]
}

type CatalogTreeNode = {
  key: string
  title: string
  locked?: boolean
  children?: CatalogTreeNode[]
}

type CatalogTabItem = LayoutPageTabItem & {
  childrens?: RawCatalogNode[]
}

type CatalogTreeSourceNode = {
  id: string
  title: string
  hiddenApplicationIds?: string[]
  childrens?: CatalogTreeSourceNode[]
  treeData?: CatalogTreeSourceNode[]
}

type DptTreeNode = {
  id: string
  name: string
  visible: boolean
  children: DptTreeNode[]
}

const catalogs = ref<CatalogTabItem[]>([])
const activeCatalogItem = ref<CatalogTabItem | undefined>(undefined)

const loadCatalogs = async () => {
  if (!projectId.value || !currentModelId.value) {
    catalogs.value = []
    activeCatalogItem.value = undefined
    return
  }

  try {
    const fetched = await fetchCatalogs(projectId.value, currentModelId.value)
    catalogs.value = fetched.map((c) => ({
      title: c.title,
      id: c.id,
      childrens: c.treeData as RawCatalogNode[]
    }))
    activeCatalogItem.value = catalogs.value[0]
  } catch {
    triggerNotification({
      type: ToastNotificationType.Danger,
      title: '目录加载失败',
      description: '请检查网络连接后重试'
    })
  }
}

const convertToDptTree = (tree: CatalogTreeSourceNode[]): DptTreeNode[] => {
  return tree.map((item) => {
    const hideObject =
      item.hiddenApplicationIds?.flatMap((applicationId): DptTreeNode[] => {
        const foundNodes = worldTree.value?.findId(applicationId) || []
        let node = foundNodes[0]
        if (!node) {
          const foundNodes = worldTree.value?.findApplicationId(applicationId) || []
          node = foundNodes[0]
        }
        const raw = node?.model?.raw as
          | { applicationId?: string; name?: string }
          | undefined
        if (!raw?.applicationId || !raw?.name) return []

        return [
          {
            id: raw.applicationId,
            name: raw.name,
            visible: true,
            children: []
          }
        ]
      }) || []
    const convertedChildren = convertToDptTree(item.treeData || item.childrens || [])
    return {
      id: item.id,
      name: item.title,
      visible: true,
      children: [...convertedChildren, ...hideObject]
    }
  })
}

const onSyncCatalog = async () => {
  if (!projectId.value || !currentModelId.value || isSaving.value) return

  isSaving.value = true
  try {
    const currentModel = scopedLoadedModel.value
    if (!currentModel) {
      throw new Error('未找到当前模型')
    }

    const treeData = await fetchCatalogs(projectId.value, currentModelId.value)
    const dptTree = convertToDptTree(treeData)
    const timestamp = new Date().toISOString()
    const { model, versionId } = currentModel
    const loadedVersion =
      model.loadedVersion.items.find((item) => item.id === versionId) ||
      model.loadedVersion.items[0]
    const seedId = loadedVersion?.seedId?.trim()
    const name = loadedVersion?.assetName?.trim() || model.name?.trim()

    if (!seedId || !name) {
      triggerNotification({
        type: ToastNotificationType.Danger,
        title: '同步失败',
        description: '未找到当前模型的 seedId'
      })
      return
    }

    const catalogData = {
      models: [
        {
          model: {
            id: seedId,
            name,
            timestamp
          },
          tree: {
            id: model.id,
            name,
            visible: true,
            children: dptTree
          }
        }
      ]
    }

    const file = new File(
      [JSON.stringify(catalogData, null, 2)],
      `catalog-${projectId.value}-${currentModelId.value}-${Date.now()}.json`,
      { type: 'application/json' }
    )

    // const downloadUrl = URL.createObjectURL(file)
    // const downloadLink = document.createElement('a')
    // downloadLink.href = downloadUrl
    // downloadLink.download = file.name
    // downloadLink.click()
    // URL.revokeObjectURL(downloadUrl)

    const formData = new FormData()
    formData.append('file', file)

    const response = await $dtpFetch<{
      status?: string
      messages?: string
      result?: Record<string, unknown>
    }>('/v1/daas/asset/bim/elements/custom-import', {
      method: 'POST',
      body: formData
    })

    if (response?.status !== 'SUCCESS') {
      throw new Error(response?.messages || '目录同步失败')
    }

    triggerNotification({
      type: ToastNotificationType.Success,
      title: '同步成功',
      description: response?.messages || '目录树已同步到 BIM 自定义构件树'
    })
  } catch (error) {
    triggerNotification({
      type: ToastNotificationType.Danger,
      title: '同步失败',
      description: error instanceof Error ? error.message : '目录同步失败'
    })
  } finally {
    isSaving.value = false
  }
}

const saveToNode = async ({
  isolatedApplicationIds,
  hiddenApplicationIds
}: {
  isolatedApplicationIds: string[]
  hiddenApplicationIds: string[]
}) => {
  const targetNodeId = selectedTreeNodeId.value
  const currentCatalogId = activeCatalogId.value
  if (
    !targetNodeId ||
    !currentCatalogId ||
    !projectId.value ||
    !currentModelId.value ||
    isSaving.value
  )
    return

  const catalogIndex = catalogs.value.findIndex((item) => item.id === currentCatalogId)
  if (catalogIndex < 0) return

  const currentCatalog = catalogs.value[catalogIndex]
  const existingChildren = Array.isArray(currentCatalog.childrens)
    ? currentCatalog.childrens
    : []
  const targetNode = findNodeById(existingChildren, targetNodeId)
  if (targetNode?.locked) {
    triggerNotification({
      type: ToastNotificationType.Danger,
      title: '保存失败',
      description: '当前节点已锁定，不能保存节点'
    })
    return
  }
  isSaving.value = true
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
    await updateCatalog(projectId.value, currentModelId.value, currentCatalogId, {
      treeData: result.updatedNodes as ViewerCatalogNode[]
    })

    const updatedCatalog: CatalogTabItem = {
      ...currentCatalog,
      childrens: result.updatedNodes
    }

    replaceCatalogAtIndex(catalogIndex, updatedCatalog)
    triggerNotification({
      type: ToastNotificationType.Success,
      title: '视图状态保存成功'
    })
  } catch (e: unknown) {
    triggerNotification({
      type: ToastNotificationType.Danger,
      title: '保存失败',
      description: e instanceof Error ? e.message : '网络连接错误'
    })
  } finally {
    isSaving.value = false
  }
}

const activeCatalogId = computed(
  () => activeCatalogItem.value?.id || catalogs.value[0]?.id
)

const isTreeNodeLocked = (node: unknown) =>
  Boolean((node as { locked?: boolean } | null)?.locked)

const getNodeLockButtonTitle = (node: unknown) =>
  isTreeNodeLocked(node) ? '解锁节点' : '锁定节点'

const mapCatalogChildrenToTreeNodes = (nodes: RawCatalogNode[]): CatalogTreeNode[] => {
  if (!Array.isArray(nodes)) return []
  return nodes.map((node) => ({
    key: node.id,
    title: node.title,
    locked: node.locked ?? false,
    children:
      Array.isArray(node.childrens) && node.childrens.length
        ? mapCatalogChildrenToTreeNodes(node.childrens)
        : undefined
  }))
}

const activeTreeData = computed<CatalogTreeNode[]>(() => {
  const children =
    catalogs.value.find((item) => item.id === activeCatalogId.value)?.childrens || []
  return mapCatalogChildrenToTreeNodes(children)
})

const showCreateCatalogDialog = ref(false)
const showRenameCatalogDialog = ref(false)
const showCreateNodeDialog = ref(false)
const activeTabMenuId = ref<string | null>(null)
const newCatalogName = ref('')
const renameCatalogName = ref('')
const newNodeName = ref('')
const editingCatalogId = ref<string | undefined>(undefined)
const editingNodeId = ref<string | undefined>(undefined)
const selectedTreeKeys = ref<string[]>([])
const selectedTreeNodeId = computed(() => selectedTreeKeys.value[0])
const tabMenuRefs = ref<Map<string, HTMLElement>>(new Map())

// 设置tab菜单引用
const setTabMenuRef = (
  el: Element | ComponentPublicInstance | null,
  catalogId: string
) => {
  if (el && el instanceof HTMLElement) {
    tabMenuRefs.value.set(catalogId, el)
  } else {
    tabMenuRefs.value.delete(catalogId)
  }
}

// 切换tab菜单显示
const toggleTabMenu = (catalogId: string) => {
  activeTabMenuId.value = activeTabMenuId.value === catalogId ? null : catalogId
}

// 计算菜单位置
const getMenuPosition = (catalogId: string) => {
  const element = tabMenuRefs.value.get(catalogId)
  if (!element) return {}

  const rect = element.getBoundingClientRect()
  return {
    left: `${rect.right}px`,
    top: `${rect.bottom + 4}px`
  }
}

// 点击外部关闭菜单
const handleClickOutside = (event: MouseEvent) => {
  if (!activeTabMenuId.value) return

  const target = event.target as HTMLElement
  const isInsideMenu = Array.from(tabMenuRefs.value.values()).some((el) =>
    el.contains(target)
  )

  if (!isInsideMenu) {
    activeTabMenuId.value = null
  }
}

// 监听全局点击事件
if (typeof window !== 'undefined') {
  document.addEventListener('click', handleClickOutside)
}

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
    const isolatedObjectIds = mapApplicationIdsToIds(
      node.isolatedApplicationIds || [],
      dataStore
    )
    const hiddenObjectIds = mapApplicationIdsToIds(
      node.hiddenApplicationIds || [],
      dataStore
    )
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
const catalogDialogTitle = computed(() =>
  editingCatalogId.value ? '编辑目录' : '创建目录'
)

const catalogDialogButtons = computed((): LayoutDialogButton[] => [
  {
    text: '取消',
    props: { color: 'outline' },
    onClick: () => {
      showCreateCatalogDialog.value = false
    }
  },
  {
    text: editingCatalogId.value ? '保存' : '创建',
    disabled: !newCatalogName.value.trim(),
    onClick: () => {
      onSubmitCatalogDialog()
    }
  }
])

const renameCatalogDialogButtons = computed((): LayoutDialogButton[] => [
  {
    text: '取消',
    props: { color: 'outline' },
    onClick: () => {
      showRenameCatalogDialog.value = false
      activeTabMenuId.value = null
    }
  },
  {
    text: '保存',
    disabled: !renameCatalogName.value.trim(),
    onClick: () => {
      onRenameCatalog()
    }
  }
])

const nodeDialogTitle = computed(() => (editingNodeId.value ? '编辑节点' : '创建节点'))

const nodeDialogButtons = computed((): LayoutDialogButton[] => [
  {
    text: '取消',
    props: { color: 'outline' },
    onClick: () => {
      showCreateNodeDialog.value = false
    }
  },
  {
    text: editingNodeId.value ? '保存' : '创建',
    disabled: !newNodeName.value.trim(),
    onClick: () => {
      onSubmitNodeDialog()
    }
  }
])

const openCreateCatalogDialog = () => {
  editingCatalogId.value = undefined
  newCatalogName.value = ''
  showCreateCatalogDialog.value = true
}

const openRenameCatalogDialogFor = (catalogId: string) => {
  const catalog = catalogs.value.find((item) => item.id === catalogId)
  if (catalog) {
    renameCatalogName.value = catalog.title
    showRenameCatalogDialog.value = true
    activeTabMenuId.value = null
    // 切换到该catalog
    activeCatalogItem.value = catalog
  }
}

const targetParentNodeId = ref<string | undefined>(undefined)

const openCreateRootNodeDialog = () => {
  editingNodeId.value = undefined
  targetParentNodeId.value = undefined
  newNodeName.value = ''
  showCreateNodeDialog.value = true
}

const openCreateChildNodeDialog = (parentId: string) => {
  editingNodeId.value = undefined
  targetParentNodeId.value = parentId
  newNodeName.value = ''
  showCreateNodeDialog.value = true
}

const openEditNodeDialog = (nodeId: string) => {
  const currentCatalogId = activeCatalogId.value
  if (!currentCatalogId) return

  const currentCatalog = catalogs.value.find((item) => item.id === currentCatalogId)
  const targetNode = findNodeById(currentCatalog?.childrens || [], nodeId)
  if (!targetNode) return

  editingNodeId.value = nodeId
  targetParentNodeId.value = undefined
  newNodeName.value = targetNode.title
  showCreateNodeDialog.value = true
}

const replaceCatalogAtIndex = (
  catalogIndex: number,
  updatedCatalog: CatalogTabItem,
  options?: {
    syncActiveItem?: boolean
  }
) => {
  const nextCatalogs = [...catalogs.value]
  nextCatalogs.splice(catalogIndex, 1, updatedCatalog)
  catalogs.value = nextCatalogs

  if (options?.syncActiveItem !== false) {
    activeCatalogItem.value = updatedCatalog
  }
}

const onSubmitCatalogDialog = async () => {
  if (editingCatalogId.value) {
    await onEditCatalog()
    return
  }

  await onAddCatalog()
}

const onEditCatalog = async () => {
  const title = newCatalogName.value.trim()
  const currentCatalogId = editingCatalogId.value
  if (
    !title ||
    !currentCatalogId ||
    !projectId.value ||
    !currentModelId.value ||
    isSaving.value
  )
    return

  const catalogIndex = catalogs.value.findIndex((item) => item.id === currentCatalogId)
  if (catalogIndex < 0) return

  const currentCatalog = catalogs.value[catalogIndex]

  try {
    isSaving.value = true
    await updateCatalog(projectId.value, currentModelId.value, currentCatalogId, {
      title
    })

    const updatedCatalog: CatalogTabItem = {
      ...currentCatalog,
      title
    }

    replaceCatalogAtIndex(catalogIndex, updatedCatalog)
    showCreateCatalogDialog.value = false
    editingCatalogId.value = undefined
    triggerNotification({
      type: ToastNotificationType.Success,
      title: '目录编辑成功'
    })
  } catch (e: unknown) {
    triggerNotification({
      type: ToastNotificationType.Danger,
      title: '目录编辑失败',
      description: e instanceof Error ? e.message : '请检查网络连接'
    })
  } finally {
    isSaving.value = false
  }
}

const onAddCatalog = async () => {
  const title = newCatalogName.value.trim()
  if (!title || !projectId.value || !currentModelId.value || isSaving.value) return

  try {
    isSaving.value = true
    const newCatalog = await createCatalog(
      projectId.value,
      currentModelId.value,
      title,
      []
    )
    const nextCatalog: CatalogTabItem = {
      id: newCatalog.id,
      title: newCatalog.title,
      childrens: []
    }

    catalogs.value = [...catalogs.value, nextCatalog]
    activeCatalogItem.value = nextCatalog
    showCreateCatalogDialog.value = false
    editingCatalogId.value = undefined
    triggerNotification({
      type: ToastNotificationType.Success,
      title: '目录创建成功'
    })
  } catch (e: unknown) {
    triggerNotification({
      type: ToastNotificationType.Danger,
      title: '目录创建失败',
      description: e instanceof Error ? e.message : '请检查网络连接'
    })
  } finally {
    isSaving.value = false
  }
}

const onRenameCatalog = async () => {
  const newTitle = renameCatalogName.value.trim()
  const currentCatalogId = activeCatalogId.value
  if (
    !newTitle ||
    !currentCatalogId ||
    !projectId.value ||
    !currentModelId.value ||
    isSaving.value
  )
    return

  const catalogIndex = catalogs.value.findIndex((item) => item.id === currentCatalogId)
  if (catalogIndex < 0) return

  try {
    isSaving.value = true
    await updateCatalog(projectId.value, currentModelId.value, currentCatalogId, {
      title: newTitle
    })

    const currentCatalog = catalogs.value[catalogIndex]
    const updatedCatalog: CatalogTabItem = {
      ...currentCatalog,
      title: newTitle
    }

    const nextCatalogs = [...catalogs.value]
    nextCatalogs.splice(catalogIndex, 1, updatedCatalog)
    catalogs.value = nextCatalogs
    activeCatalogItem.value = updatedCatalog
    showRenameCatalogDialog.value = false
    triggerNotification({
      type: ToastNotificationType.Success,
      title: '目录重命名成功'
    })
  } catch (e: unknown) {
    triggerNotification({
      type: ToastNotificationType.Danger,
      title: '目录重命名失败',
      description: e instanceof Error ? e.message : '请检查网络连接'
    })
  } finally {
    isSaving.value = false
  }
}

const onSubmitNodeDialog = async () => {
  if (editingNodeId.value) {
    await onEditNode()
    return
  }

  await onAddNode()
}

const onEditNode = async () => {
  const title = newNodeName.value.trim()
  const targetNodeId = editingNodeId.value
  const currentCatalogId = activeCatalogId.value
  if (
    !title ||
    !targetNodeId ||
    !currentCatalogId ||
    !projectId.value ||
    !currentModelId.value ||
    isSaving.value
  )
    return

  const catalogIndex = catalogs.value.findIndex((item) => item.id === currentCatalogId)
  if (catalogIndex < 0) return

  isSaving.value = true

  const currentCatalog = catalogs.value[catalogIndex]
  const existingChildren = Array.isArray(currentCatalog.childrens)
    ? currentCatalog.childrens
    : []
  const updateNodeTitleById = (
    nodes: RawCatalogNode[],
    nodeId: string,
    nextTitle: string
  ): { updatedNodes: RawCatalogNode[]; updated: boolean } => {
    let updated = false
    const updatedNodes = nodes.map((node) => {
      if (node.id === nodeId) {
        updated = true
        return {
          ...node,
          title: nextTitle
        }
      }

      const children = node.childrens || []
      if (!children.length) return node

      const childResult = updateNodeTitleById(children, nodeId, nextTitle)
      if (!childResult.updated) return node

      updated = true
      return {
        ...node,
        childrens: childResult.updatedNodes
      }
    })

    return { updatedNodes, updated }
  }

  const result = updateNodeTitleById(existingChildren, targetNodeId, title)
  if (!result.updated) {
    isSaving.value = false
    return
  }

  try {
    await updateCatalog(projectId.value, currentModelId.value, currentCatalogId, {
      treeData: result.updatedNodes as ViewerCatalogNode[]
    })

    const updatedCatalog: CatalogTabItem = {
      ...currentCatalog,
      childrens: result.updatedNodes
    }

    replaceCatalogAtIndex(catalogIndex, updatedCatalog)
    showCreateNodeDialog.value = false
    editingNodeId.value = undefined
    triggerNotification({
      type: ToastNotificationType.Success,
      title: '节点编辑成功'
    })
  } catch (e: unknown) {
    triggerNotification({
      type: ToastNotificationType.Danger,
      title: '节点编辑失败',
      description: e instanceof Error ? e.message : '网络或服务器错误'
    })
  } finally {
    isSaving.value = false
  }
}

const onAddNode = async () => {
  const title = newNodeName.value.trim()
  if (!title || !projectId.value || !currentModelId.value || isSaving.value) return

  const currentCatalogId = activeCatalogId.value
  if (!currentCatalogId) return

  const catalogIndex = catalogs.value.findIndex((item) => item.id === currentCatalogId)
  if (catalogIndex < 0) return

  isSaving.value = true

  const currentCatalog = catalogs.value[catalogIndex]
  const existingChildren = Array.isArray(currentCatalog.childrens)
    ? currentCatalog.childrens
    : []

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

    if (!insertionResult.inserted) {
      isSaving.value = false
      return
    }
    updatedNodes = insertionResult.updatedNodes
  }

  try {
    await updateCatalog(projectId.value, currentModelId.value, currentCatalogId, {
      treeData: updatedNodes as ViewerCatalogNode[]
    })

    const updatedCatalog: CatalogTabItem = {
      ...currentCatalog,
      childrens: updatedNodes
    }

    replaceCatalogAtIndex(catalogIndex, updatedCatalog)
    showCreateNodeDialog.value = false
    editingNodeId.value = undefined

    // Automatically select the new node or expand parents
    selectedTreeKeys.value = [nextNode.id]

    triggerNotification({
      type: ToastNotificationType.Success,
      title: '节点创建成功'
    })
  } catch (e: unknown) {
    triggerNotification({
      type: ToastNotificationType.Danger,
      title: '节点创建失败',
      description: e instanceof Error ? e.message : '网络或服务器错误'
    })
  } finally {
    isSaving.value = false
  }
}

const onDeleteCatalogFor = async (catalogId: string) => {
  // eslint-disable-next-line no-alert
  if (!window.confirm('确认要删除该目录吗？此操作不可撤销。')) return

  // 切换到该catalog
  const catalog = catalogs.value.find((item) => item.id === catalogId)
  if (catalog) {
    activeCatalogItem.value = catalog
  }

  await performDeleteCatalog(catalogId)
}

const performDeleteCatalog = async (catalogId: string) => {
  if (!catalogId || !projectId.value || !currentModelId.value || isSaving.value) return

  try {
    isSaving.value = true
    await deleteCatalog(projectId.value, currentModelId.value, catalogId)

    catalogs.value = catalogs.value.filter((c) => c.id !== catalogId)
    if (catalogs.value.length > 0) {
      activeCatalogItem.value = catalogs.value[0]
    } else {
      activeCatalogItem.value = undefined
    }

    activeTabMenuId.value = null
    triggerNotification({
      type: ToastNotificationType.Success,
      title: '目录已删除'
    })
  } catch (e: unknown) {
    triggerNotification({
      type: ToastNotificationType.Danger,
      title: '删除目录失败',
      description: e instanceof Error ? e.message : '网络或服务器错误'
    })
  } finally {
    isSaving.value = false
  }
}

const onDeleteSpecificNode = async (nodeId: string) => {
  const currentCatalogId = activeCatalogId.value
  if (
    !currentCatalogId ||
    !nodeId ||
    !projectId.value ||
    !currentModelId.value ||
    isSaving.value
  )
    return

  // eslint-disable-next-line no-alert
  if (!window.confirm('确认要删除选中的节点及其所有子节点吗？此操作不可撤销。')) return

  const catalogIndex = catalogs.value.findIndex((item) => item.id === currentCatalogId)
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
    await updateCatalog(projectId.value, currentModelId.value, currentCatalogId, {
      treeData: result.updatedNodes as ViewerCatalogNode[]
    })

    const updatedCatalog: CatalogTabItem = {
      ...currentCatalog,
      childrens: result.updatedNodes
    }

    replaceCatalogAtIndex(catalogIndex, updatedCatalog)

    if (selectedTreeNodeId.value === nodeId) {
      selectedTreeKeys.value = []
    }

    triggerNotification({
      type: ToastNotificationType.Success,
      title: '节点已删除'
    })
  } catch (e: unknown) {
    triggerNotification({
      type: ToastNotificationType.Danger,
      title: '删除节点失败',
      description: e instanceof Error ? e.message : '网络或服务器错误'
    })
  } finally {
    isSaving.value = false
  }
}

const onToggleNodeLocked = async (nodeId: string, locked: boolean) => {
  const currentCatalogId = activeCatalogId.value
  if (
    !currentCatalogId ||
    !nodeId ||
    !projectId.value ||
    !currentModelId.value ||
    isSaving.value
  )
    return

  const catalogIndex = catalogs.value.findIndex((item) => item.id === currentCatalogId)
  if (catalogIndex < 0) return

  isSaving.value = true

  const currentCatalog = catalogs.value[catalogIndex]
  const existingChildren = Array.isArray(currentCatalog.childrens)
    ? currentCatalog.childrens
    : []
  const updateNodeLockedById = (
    nodes: RawCatalogNode[],
    targetId: string,
    nextLocked: boolean
  ): { updatedNodes: RawCatalogNode[]; updated: boolean } => {
    let updated = false
    const updatedNodes = nodes.map((node) => {
      if (node.id === targetId) {
        updated = true
        return {
          ...node,
          locked: nextLocked
        }
      }

      const children = node.childrens || []
      if (!children.length) return node

      const childResult = updateNodeLockedById(children, targetId, nextLocked)
      if (!childResult.updated) return node

      updated = true
      return {
        ...node,
        childrens: childResult.updatedNodes
      }
    })

    return { updatedNodes, updated }
  }

  const result = updateNodeLockedById(existingChildren, nodeId, locked)
  if (!result.updated) {
    isSaving.value = false
    return
  }

  try {
    await updateCatalog(projectId.value, currentModelId.value, currentCatalogId, {
      treeData: result.updatedNodes as ViewerCatalogNode[]
    })

    const updatedCatalog: CatalogTabItem = {
      ...currentCatalog,
      childrens: result.updatedNodes
    }

    replaceCatalogAtIndex(catalogIndex, updatedCatalog)

    triggerNotification({
      type: ToastNotificationType.Success,
      title: locked ? '节点已锁定' : '节点已解锁'
    })
  } catch (e: unknown) {
    triggerNotification({
      type: ToastNotificationType.Danger,
      title: locked ? '锁定节点失败' : '解锁节点失败',
      description: e instanceof Error ? e.message : '网络或服务器错误'
    })
  } finally {
    isSaving.value = false
  }
}

watch(
  [projectId, currentModelId],
  () => {
    loadCatalogs()
  },
  { immediate: true }
)
</script>

<style scoped>
/* 强制覆盖输入框聚焦时的边框颜色与背景色 */
:deep(input:focus),
:deep(input:focus-visible),
:deep(textarea:focus),
:deep(textarea:focus-visible) {
  border-color: #00b4b6 !important;
  background-color: #ffffff !important;
  outline: none !important;
  box-shadow: none !important;
}
</style>
