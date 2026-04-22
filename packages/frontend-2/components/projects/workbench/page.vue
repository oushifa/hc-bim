<template>
  <div class="h-full flex flex-col relative">
    <!-- Header -->
    <div
      class="h-14 border-b border-gray-100 bg-gray-50 flex items-center justify-between shrink-0 px-4"
    >
      <div class="flex items-center space-x-4">
        <button
          class="flex items-center space-x-1 text-[#00b4b6] bg-[#e6f7f8] hover:bg-[#00b4b6] hover:text-white px-3 py-1.5 rounded-[8px] text-sm font-medium transition-colors"
          @click="goBack"
        >
          <ArrowLeftIcon class="w-4 h-4" />
          <span>返回</span>
        </button>
        <h2 class="text-base font-medium text-[#333]">{{ projectName }}</h2>
      </div>
      <div class="flex space-x-2">
        <button
          class="flex items-center space-x-1 bg-gradient-to-r from-[#00b4b6] to-[#009fa1] text-white px-3 py-1.5 rounded-[8px] text-sm font-medium transition-opacity hover:opacity-90 shadow-sm"
          @click="viewAllIn3D"
        >
          <EyeIcon class="w-4 h-4" />
          <span>在3D中查看全部</span>
        </button>
        <button
          class="flex items-center space-x-1 bg-white/80 backdrop-blur-md border border-gray-200 text-gray-600 hover:text-[#00b4b6] hover:border-[#00b4b6] px-3 py-1.5 rounded text-sm font-medium transition-colors"
          @click="showImportModal = true"
        >
          <InboxIcon class="w-4 h-4" />
          <span>从模型库导入</span>
        </button>
        <button
          class="flex items-center space-x-1 bg-[#e6f7f8] text-[#00b4b6] hover:bg-[#00b4b6] hover:text-white px-3 py-1.5 rounded text-sm font-medium transition-colors"
          :disabled="!uploadProject"
          :class="{ 'opacity-60 cursor-not-allowed': !uploadProject }"
          @click="triggerUploadPicker"
        >
          <ArrowUpTrayIcon class="w-4 h-4" />
          <span>上传模型</span>
        </button>
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 flex overflow-hidden">
      <!-- Left: Directory Tree -->
      <div
        class="w-64 border-r border-gray-100 bg-[#fafbfc] overflow-y-auto flex flex-col"
      >
        <div class="px-2 pb-4 space-y-0.5 flex-1">
          <div
            v-for="row in visibleRows"
            :key="row.id"
            class="group w-full flex items-center justify-between px-2 py-1.5 rounded-[8px] text-sm transition-colors"
            :style="{ paddingLeft: `${row.level * 12 + 8}px` }"
            :class="
              isSelected(row.id)
                ? 'bg-[#e6f7f8] text-[#00b4b6] font-medium'
                : 'text-gray-600 hover:bg-gray-100'
            "
          >
            <div class="flex items-center space-x-2 overflow-hidden flex-1 min-w-0">
              <button
                class="p-0.5 hover:bg-gray-200 rounded text-gray-400 disabled:opacity-40"
                :disabled="!row.hasChildren"
                @click.stop="toggleDir(row.id)"
              >
                <ChevronDownIcon
                  v-if="row.hasChildren && isExpanded(row.id)"
                  class="w-3.5 h-3.5"
                />
                <ChevronRightIcon v-else-if="row.hasChildren" class="w-3.5 h-3.5" />
                <span v-else class="inline-block w-3.5 h-3.5" />
              </button>
              <FolderIcon
                :class="[
                  'w-4 h-4 shrink-0',
                  isSelected(row.id) ? 'text-[#00b4b6]' : 'text-gray-400'
                ]"
              />
              <button
                class="truncate text-left flex-1"
                :class="isSelected(row.id) ? 'text-[#00b4b6]' : 'text-gray-600'"
                @click="setActiveDir(row.id)"
              >
                {{ row.name }}
              </button>
            </div>
            <button
              class="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-[#00b4b6]"
              title="添加子目录"
              @click.stop="openAddDirModal(row.id)"
            >
              <PlusIcon class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <!-- Right: Model List -->
      <div class="flex-1 flex flex-col overflow-hidden bg-white/80 backdrop-blur-md">
        <div
          class="py-4 border-b border-gray-100 flex justify-between items-center bg-white/80 backdrop-blur-md shrink-0"
        >
          <h3 class="text-sm font-medium text-[#333] px-6">
            {{ activeDirName }} 模型列表
          </h3>
          <div class="flex items-center space-x-4 pr-4">
            <div class="relative">
              <MagnifyingGlassIcon
                class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
              />
              <label for="workbench-model-search" class="sr-only">搜索模型</label>
              <input
                id="workbench-model-search"
                v-model="searchQuery"
                type="text"
                placeholder="搜索模型..."
                class="w-64 bg-[#f5f7fa] border border-transparent rounded-[8px] py-1.5 pl-9 pr-4 text-sm focus:outline-none focus:border-[#00b4b6] focus:bg-white/80 text-[#333] transition-all"
              />
            </div>
          </div>
        </div>

        <div class="flex-1 overflow-auto bg-[#f5f7fa] p-6">
          <div
            v-if="modelsLoading && !displayedModels.length"
            class="bg-white/80 backdrop-blur-md border border-gray-200 rounded-[8px] p-12 text-center text-gray-500"
          >
            模型加载中...
          </div>
          <div
            v-else-if="displayedModels.length === 0"
            class="bg-white/80 backdrop-blur-md border border-gray-200 rounded-[8px] p-12 text-center text-gray-500"
          >
            该目录下暂无模型，请从模型库导入或上传。
          </div>
          <div
            v-else-if="viewMode === 'grid'"
            class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          >
            <div
              v-for="model in displayedModels"
              :key="model.id"
              class="bg-white/80 backdrop-blur-md border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow flex flex-col h-[280px] cursor-pointer"
              role="button"
              tabindex="0"
              @click="openModel(model)"
              @keydown.enter.prevent="openModel(model)"
              @keydown.space.prevent="openModel(model)"
            >
              <div class="p-3 flex justify-between items-start shrink-0">
                <h3
                  class="text-sm font-medium text-[#333] line-clamp-2 pr-2 whitespace-pre-line leading-snug"
                >
                  {{ model.name }}
                </h3>
                <button class="text-gray-400 hover:text-gray-600 p-1 shrink-0">
                  <EllipsisHorizontalIcon class="h-4 w-4" />
                </button>
              </div>
              <div
                class="flex-1 flex flex-col items-center justify-center p-4 min-h-0 bg-gradient-to-br from-gray-50 to-gray-100"
              >
                <div
                  v-if="model.previewUrl"
                  class="w-full h-full rounded-md overflow-hidden border border-gray-200"
                >
                  <PreviewImage :preview-url="model.previewUrl" />
                </div>
                <CubeIcon v-else class="w-20 h-20 text-gray-300" />
              </div>
              <div
                class="p-3 border-t border-gray-100 flex justify-between items-end shrink-0"
              >
                <div class="flex flex-col">
                  <span class="text-xs text-gray-500">
                    {{ formatDate(model.updatedAt) }}
                  </span>
                </div>
                <div class="flex items-center space-x-3 text-gray-500">
                  <div class="flex items-center space-x-1" title="评论">
                    <ChatBubbleLeftIcon class="h-3.5 w-3.5" />
                    <span class="text-xs">{{ model.commentCount }}</span>
                  </div>
                  <div class="flex items-center space-x-1" title="版本">
                    <ClockIcon class="h-3.5 w-3.5" />
                    <span class="text-xs">{{ model.versionsCount || 0 }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div
            v-else
            class="bg-white/80 backdrop-blur-md border border-gray-200 rounded-lg overflow-hidden"
          >
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-[#f8f9fa] text-gray-500 text-sm border-b border-gray-200">
                  <th class="px-4 py-3 font-medium">模型名称</th>
                  <th class="px-4 py-3 font-medium">更新时间</th>
                  <th class="px-4 py-3 font-medium text-center">版本数</th>
                  <th class="px-4 py-3 font-medium text-right">操作</th>
                </tr>
              </thead>
              <tbody class="text-sm text-[#333] divide-y divide-gray-100">
                <tr
                  v-for="model in displayedModels"
                  :key="model.id"
                  class="hover:bg-[#fcfcfc] transition-colors group cursor-pointer"
                  @click="openModel(model)"
                >
                  <td class="px-4 py-3">
                    <div class="flex items-center space-x-3">
                      <div
                        v-if="model.previewUrl"
                        class="w-12 h-8 rounded overflow-hidden border border-gray-200 bg-gray-50 shrink-0"
                      >
                        <PreviewImage :preview-url="model.previewUrl" />
                      </div>
                      <CubeIcon v-else class="h-4 w-4 text-gray-400 shrink-0" />
                      <span class="font-medium whitespace-pre-line">
                        {{ model.name }}
                      </span>
                    </div>
                  </td>
                  <td class="px-4 py-3 text-gray-500">
                    {{ formatDate(model.updatedAt) }}
                  </td>
                  <td class="px-4 py-3 text-center text-gray-500">
                    {{ model.versionsCount || 0 }}
                  </td>
                  <td class="px-4 py-3 text-right">
                    <div
                      class="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <button
                        title="查看"
                        class="p-1.5 text-[#00b4b6] hover:bg-[#e6f7f8] rounded"
                        @click.stop="openModel(model)"
                      >
                        <EyeIcon class="h-4 w-4" />
                      </button>
                      <button
                        title="历史版本管理"
                        class="p-1.5 text-[#00b4b6] hover:bg-[#e6f7f8] rounded"
                      >
                        <ClockIcon class="h-4 w-4" />
                      </button>
                      <button
                        title="数据下载及导出"
                        class="p-1.5 text-[#00b4b6] hover:bg-[#e6f7f8] rounded"
                      >
                        <ArrowDownTrayIcon class="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <InfiniteLoading
            v-if="displayedModels.length && moreToLoad"
            :settings="{ identifier: infiniteLoaderId }"
            @infinite="infiniteLoad"
          />
        </div>
      </div>
    </div>

    <!-- Import Dialog -->
    <ImportDialog
      v-if="showImportModal"
      :active-dir-name="activeDirName"
      :imported-model-ids="importedModelIds"
      @close="showImportModal = false"
      @import="handleImport"
    />
    <ProjectCardImportFileArea
      v-if="uploadProject"
      ref="uploadAreaRef"
      :project="uploadProject"
      class="hidden"
      @uploading="onModelUploading"
    />

    <!-- Add Directory Modal -->
    <div
      v-if="showDirModal"
      class="absolute inset-0 z-50 flex items-center justify-center bg-white/40 backdrop-blur-sm"
    >
      <div
        class="bg-white/80 backdrop-blur-md rounded-[26px] shadow-2xl w-[400px] flex flex-col overflow-hidden"
      >
        <div class="p-4 border-b border-gray-100 flex justify-between items-center">
          <h3 class="text-lg font-medium text-[#333]">
            {{
              dirModalParentId && dirModalParentId !== ROOT_ID
                ? '新建子目录'
                : '新建目录'
            }}
          </h3>
          <button class="text-gray-400 hover:text-gray-600" @click="closeDirModal">
            关闭
          </button>
        </div>
        <div class="p-6">
          <label
            for="new-directory-name"
            class="block text-sm font-medium text-gray-700 mb-2"
          >
            目录名称
          </label>
          <input
            id="new-directory-name"
            v-model="newDirName"
            type="text"
            placeholder="请输入目录名称"
            class="w-full bg-white/80 backdrop-blur-md border border-gray-300 rounded-md py-2 px-3 text-sm focus:outline-none focus:border-[#00b4b6] focus:ring-1 focus:ring-[#00b4b6] text-[#333]"
            @keyup.enter="addDirectory"
          />
        </div>
        <div
          class="p-4 border-t border-gray-100 flex justify-end space-x-3 bg-white/50"
        >
          <button
            class="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            @click="closeDirModal"
          >
            取消
          </button>
          <button
            :disabled="!newDirName.trim()"
            :class="[
              'px-4 py-2 text-sm font-medium text-white rounded-md transition-colors',
              newDirName.trim()
                ? 'bg-[#00b4b6] hover:bg-[#009fa1]'
                : 'bg-gray-300 cursor-not-allowed'
            ]"
            @click="addDirectory"
          >
            确认
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  ArrowLeftIcon,
  EyeIcon,
  InboxIcon,
  ArrowUpTrayIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  EllipsisHorizontalIcon,
  CubeIcon,
  ChatBubbleLeftIcon,
  ClockIcon,
  ArrowDownTrayIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  FolderIcon
} from '@heroicons/vue/24/outline'
import { useApolloClient, useQuery } from '@vue/apollo-composable'
import type {
  ProjectCardImportFileArea_ProjectFragment,
  ProjectPageLatestItemsModelItemFragment
} from '~/lib/common/generated/gql/graphql'
import {
  latestModelsPaginationQuery,
  latestModelsQuery
} from '~/lib/projects/graphql/queries'
import type { InfiniteLoaderState } from '~~/lib/global/helpers/components'
import { getModelItemRoute } from '~/lib/projects/helpers/models'
import dayjs from 'dayjs'
import type { FileAreaUploadingPayload } from '~/lib/form/helpers/fileUpload'
import { gql } from 'graphql-tag'
import ImportDialog from '~/components/projects/workbench/ImportDialog.vue'
import ProjectCardImportFileArea from '~/components/project/CardImportFileArea.vue'

const props = defineProps<{
  projectId: string
}>()

const router = useRouter()
const logger = useLogger()
const apollo = useApolloClient().client

const goBack = () => {
  router.push('/projects')
}

type RawTreeItem = {
  id: string
  name: string
  parent: string | null
  relative: string[]
}

type VisibleRow = {
  id: string
  name: string
  level: number
  hasChildren: boolean
}

type ModelListItem = {
  id: string
  name: string
  updatedAt: string
  versionsCount: number
  commentCount: number
  previewUrl?: string | null
  raw: ProjectPageLatestItemsModelItemFragment
}

const ROOT_ID = 'all'
const projectName = computed(() => uploadProject.value?.name || '项目工作台')

const activeDir = ref(ROOT_ID)
const viewMode = ref<'grid' | 'list'>('list')
const searchQuery = ref('')

const showImportModal = ref(false)
const showDirModal = ref(false)
const dirModalParentId = ref<string | null>(null)
const newDirName = ref('')
const infiniteLoaderId = ref('')
const loadCacheBuster = ref(0)
const isModelUploading = ref(false)
const uploadAreaRef = ref<null | { triggerPicker: () => void }>(null)

const triggerUploadPicker = () => {
  uploadAreaRef.value?.triggerPicker()
}

const onModelUploading = async (payload: FileAreaUploadingPayload) => {
  const wasUploading = isModelUploading.value
  isModelUploading.value = payload.isUploading
  if (wasUploading && !payload.isUploading) {
    loadCacheBuster.value++
    await Promise.all([loadFolders()])
  }
}

const workbenchUploadProjectQuery = gql`
  query WorkbenchUploadProject($projectId: String!) {
    project(id: $projectId) {
      id
      name
      permissions {
        canCreateModel {
          authorized
          code
          message
          payload
          errorMessage
        }
      }
    }
  }
`

const { result: uploadProjectResult } = useQuery(workbenchUploadProjectQuery, () => ({
  projectId: props.projectId
}))
const uploadProject = computed(
  () =>
    (uploadProjectResult.value?.project as ProjectCardImportFileArea_ProjectFragment & {
      name?: string
    }) || null
)

const projectFoldersByParentQuery = gql`
  query WorkbenchProjectFoldersByParent($projectId: String!, $parentId: String) {
    project(id: $projectId) {
      id
      folders(limit: 100, filter: { parentId: $parentId }) {
        items {
          id
          name
          projectId
          parentId
          models {
            id
          }
        }
      }
    }
  }
`

const createFolderMutation = gql`
  mutation WorkbenchCreateFolder($input: CreateFolderInput!) {
    folderMutations {
      create(input: $input) {
        id
      }
    }
  }
`

const folderRows = ref<RawTreeItem[]>([])
const expandedDirIds = ref<Set<string>>(new Set([ROOT_ID]))

const setActiveDir = (id: string) => {
  activeDir.value = id
}

const toggleDir = (id: string) => {
  if (!visibleRows.value.find((row) => row.id === id)?.hasChildren) return
  if (expandedDirIds.value.has(id)) {
    expandedDirIds.value.delete(id)
  } else {
    expandedDirIds.value.add(id)
  }
  expandedDirIds.value = new Set(expandedDirIds.value)
}

const openAddDirModal = (parentId: string | null) => {
  dirModalParentId.value = parentId
  newDirName.value = ''
  showDirModal.value = true
}

const closeDirModal = () => {
  showDirModal.value = false
  dirModalParentId.value = null
  newDirName.value = ''
}

const loadFolders = async () => {
  if (!props.projectId) return

  const rows: RawTreeItem[] = []
  const traverse = async (parentId: string | null) => {
    const res = await apollo.query<{
      project?: {
        folders?: {
          items: Array<{
            id: string
            name: string
            parentId?: string | null
            models?: Array<{ id: string }>
          }>
        }
      }
    }>({
      query: projectFoldersByParentQuery,
      variables: {
        projectId: props.projectId,
        parentId
      },
      fetchPolicy: 'no-cache'
    })
    const items = res.data?.project?.folders?.items || []
    rows.push(
      ...items.map((item) => ({
        id: item.id,
        name: item.name,
        parent: item.parentId || null,
        relative: (item.models || []).map((m) => m.id)
      }))
    )
    for (const item of items) {
      await traverse(item.id)
    }
  }

  await traverse(null)
  folderRows.value = rows
}

const childrenMap = computed(() => {
  const map = new Map<string, RawTreeItem[]>()
  const ensure = (key: string) => {
    if (!map.has(key)) map.set(key, [])
    return map.get(key) as RawTreeItem[]
  }

  ensure(ROOT_ID)
  folderRows.value.forEach((item) => {
    const parentKey = item.parent || ROOT_ID
    ensure(parentKey).push(item)
  })
  return map
})

const visibleRows = computed<VisibleRow[]>(() => {
  const rows: VisibleRow[] = []
  const walk = (parentId: string, level: number) => {
    const children = childrenMap.value.get(parentId) || []
    children.forEach((child) => {
      const hasChildren = (childrenMap.value.get(child.id)?.length || 0) > 0
      rows.push({
        id: child.id,
        name: child.name,
        level,
        hasChildren
      })
      if (expandedDirIds.value.has(child.id)) {
        walk(child.id, level + 1)
      }
    })
  }
  rows.push({
    id: ROOT_ID,
    name: projectName.value,
    level: 0,
    hasChildren: (childrenMap.value.get(ROOT_ID)?.length || 0) > 0
  })
  if (expandedDirIds.value.has(ROOT_ID)) {
    walk(ROOT_ID, 1)
  }
  return rows
})

const isSelected = (id: string) => activeDir.value === id
const isExpanded = (id: string) => expandedDirIds.value.has(id)

const addDirectory = async () => {
  if (!newDirName.value.trim()) return

  const parentId =
    !dirModalParentId.value || dirModalParentId.value === ROOT_ID
      ? null
      : dirModalParentId.value

  await apollo.mutate({
    mutation: createFolderMutation,
    variables: {
      input: {
        projectId: props.projectId,
        name: newDirName.value.trim(),
        parentId
      }
    }
  })

  if (parentId) {
    expandedDirIds.value.add(parentId)
    expandedDirIds.value = new Set(expandedDirIds.value)
  }

  await loadFolders()
  closeDirModal()
}

const selectedDirModelIds = computed<string[] | null>(() => {
  if (activeDir.value === ROOT_ID) return null
  return folderRows.value.find((item) => item.id === activeDir.value)?.relative || []
})

const latestModelsQueryVariables = computed(() => {
  const ids = selectedDirModelIds.value
  const trimmedSearch = searchQuery.value.trim()
  const hasFilter = !!trimmedSearch || !!ids
  return {
    projectId: props.projectId,
    filter: hasFilter
      ? {
          search: trimmedSearch || null,
          ids: ids && ids.length ? ids : null
        }
      : null
  }
})

const shouldSkipModelsQuery = computed(
  () => activeDir.value !== ROOT_ID && !selectedDirModelIds.value?.length
)

const {
  result: baseModelsResult,
  variables: baseModelsVariables,
  loading: baseModelsLoading,
  onResult: onBaseModelsResult
} = useQuery(
  latestModelsQuery,
  () => latestModelsQueryVariables.value,
  () => ({ enabled: !shouldSkipModelsQuery.value })
)

const {
  result: extraModelsResult,
  fetchMore: fetchMoreModels,
  loading: extraModelsLoading,
  onResult: onExtraModelsResult
} = useQuery(
  latestModelsPaginationQuery,
  () => ({
    ...latestModelsQueryVariables.value,
    cursor: null as string | null
  }),
  () => ({ enabled: !shouldSkipModelsQuery.value })
)

const displayedModelFragments = computed(() => {
  if (shouldSkipModelsQuery.value) return []
  return extraModelsResult.value
    ? extraModelsResult.value?.project?.models?.items || []
    : baseModelsResult.value?.project?.models?.items || []
})

const displayedModels = computed<ModelListItem[]>(() =>
  displayedModelFragments.value.map((model) => ({
    id: model.id,
    name: model.displayName || model.name,
    updatedAt: model.updatedAt,
    versionsCount: model.versionCount.totalCount,
    commentCount: model.commentThreadCount.totalCount,
    previewUrl: model.previewUrl,
    raw: model
  }))
)

const modelsLoading = computed(() => {
  if (shouldSkipModelsQuery.value) return false
  return baseModelsLoading.value || extraModelsLoading.value
})

const moreToLoad = computed(() => {
  if (shouldSkipModelsQuery.value) return false
  if (!baseModelsResult.value?.project) return true
  const loadedCount =
    extraModelsResult.value?.project?.models?.items.length ||
    baseModelsResult.value.project.models.items.length
  return loadedCount < baseModelsResult.value.project.models.totalCount
})

const calculateLoaderId = () => {
  const id = JSON.stringify(baseModelsVariables.value?.filter || {})
  infiniteLoaderId.value = `${id}-${loadCacheBuster.value}`
}

const infiniteLoad = async (state: InfiniteLoaderState) => {
  const cursor =
    extraModelsResult.value?.project?.models?.cursor ||
    baseModelsResult.value?.project?.models?.cursor ||
    null

  if (!moreToLoad.value || !cursor) return state.complete()

  try {
    await fetchMoreModels({
      variables: {
        cursor
      }
    })
  } catch (e) {
    logger.error(e)
    state.error()
    return
  }

  state.loaded()
  if (!moreToLoad.value) state.complete()
}

const importedModelIds = computed(() => displayedModels.value.map((model) => model.id))

const handleImport = async () => {
  showImportModal.value = false
  loadCacheBuster.value++
  await Promise.all([loadFolders()])
}

const activeDirName = computed(() => {
  if (activeDir.value === ROOT_ID) return '全部模型'
  return folderRows.value.find((dir) => dir.id === activeDir.value)?.name || '全部模型'
})

const openModel = (model: ModelListItem) => {
  router.push(getModelItemRoute(model.raw))
}

const formatDate = (dateStr: string) => {
  return dayjs(dateStr).format('YYYY-MM-DD HH:mm')
}

const viewAllIn3D = () => {
  router.push(`/projects/${props.projectId}/models/all`)
}

onBaseModelsResult(calculateLoaderId)
onExtraModelsResult(calculateLoaderId)
onMounted(loadFolders)
</script>
