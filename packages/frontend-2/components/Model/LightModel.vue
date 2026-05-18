<template>
  <div class="h-full">
    <div
      class="h-full flex flex-col bg-white/80 backdrop-blur-md rounded-[26px] shadow-sm overflow-hidden"
    >
      <!-- Header & Toolbar -->
      <div
        class="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0"
      >
        <div class="flex items-center space-x-2">
          <h2 class="text-xl font-bold text-[#333]">模型</h2>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <!-- Search -->
          <div class="relative">
            <label for="model-search" class="sr-only">搜索模型</label>
            <input
              id="model-search"
              v-model="searchQuery"
              type="text"
              placeholder="搜索模型..."
              :class="[
                'w-48 border rounded-[8px] py-1.5 pl-3 pr-8 text-sm focus:outline-none focus:ring-0 focus:border-[#00b4b6] focus:bg-white text-[#333] transition-all',
                searchQuery ? 'border-[#00b4b6] bg-white' : 'border-transparent bg-gray-50'
              ]"
              @input="debouncedFetch"
            />
            <MagnifyingGlassIcon
              class="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
            />
          </div>

          <!-- Custom Dropdowns -->
          <div class="flex items-center gap-3">
            <div ref="memberSelectRef" class="relative w-32">
              <button
                type="button"
                :class="[
                  'w-full px-3 py-1.5 border rounded-[8px] text-sm flex items-center justify-between cursor-pointer transition-colors text-gray-600',
                  memberFilter !== 'all' ? 'border-[#00b4b6] bg-white' : 'border-transparent bg-gray-50'
                ]"
                @click="toggleMemberMenu"
              >
                <span class="truncate">
                  {{ memberOptions.find((o) => o.value === memberFilter)?.label }}
                </span>
                <ChevronDownIcon
                  :class="[
                    'w-4 h-4 text-gray-400 transition-transform',
                    memberOpen ? 'rotate-180' : ''
                  ]"
                />
              </button>
              <Transition name="fade-down">
                <div
                  v-if="memberOpen"
                  class="absolute top-full left-0 mt-1 w-full bg-white border border-[#00b4b6] rounded-[8px] shadow-lg z-50 overflow-hidden py-1"
                >
                  <button
                    v-for="opt in memberOptions"
                    :key="opt.value"
                    type="button"
                    class="w-full px-3 py-2 text-sm cursor-pointer transition-colors text-left"
                    :class="
                      memberFilter === opt.value
                        ? 'bg-[#00b4b6] text-white'
                        : 'text-gray-600 hover:bg-[#e6f7f8] hover:text-[#00b4b6]'
                    "
                    @click="selectMemberFilter(opt.value)"
                  >
                    {{ opt.label }}
                  </button>
                </div>
              </Transition>
            </div>

            <div ref="sourceSelectRef" class="relative w-32">
              <button
                type="button"
                :class="[
                  'w-full px-3 py-1.5 border rounded-[8px] text-sm flex items-center justify-between cursor-pointer transition-colors text-gray-600',
                  sourceFilter !== 'all' ? 'border-[#00b4b6] bg-white' : 'border-transparent bg-gray-50'
                ]"
                @click="toggleSourceMenu"
              >
                <span class="truncate">
                  {{ sourceOptions.find((o) => o.value === sourceFilter)?.label }}
                </span>
                <ChevronDownIcon
                  :class="[
                    'w-4 h-4 text-gray-400 transition-transform',
                    sourceOpen ? 'rotate-180' : ''
                  ]"
                />
              </button>
              <Transition name="fade-down">
                <div
                  v-if="sourceOpen"
                  class="absolute top-full left-0 mt-1 w-full bg-white border border-[#00b4b6] rounded-[8px] shadow-lg z-50 overflow-hidden py-1"
                >
                  <button
                    v-for="opt in sourceOptions"
                    :key="opt.value"
                    type="button"
                    class="w-full px-3 py-2 text-sm cursor-pointer transition-colors text-left"
                    :class="
                      sourceFilter === opt.value
                        ? 'bg-[#00b4b6] text-white'
                        : 'text-gray-600 hover:bg-[#e6f7f8] hover:text-[#00b4b6]'
                    "
                    @click="selectSourceFilter(opt.value)"
                  >
                    {{ opt.label }}
                  </button>
                </div>
              </Transition>
            </div>
          </div>

          <!-- Action Button -->
          <button
            v-if="hasModelOp('canUpload')"
            class="bg-[#00b4b6] hover:bg-[#009fa1] text-white px-4 py-1.5 rounded-[8px] text-sm font-medium transition-colors"
          >
            新建模型
          </button>
        </div>
      </div>

      <!-- Content Area -->
      <div class="flex-1 overflow-auto bg-[#f5f7fa] p-6">
        <div
          class="bg-white/80 backdrop-blur-md border border-gray-200 rounded-[8px] overflow-hidden"
        >
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-[#f8f9fa] text-gray-500 text-sm border-b border-gray-200">
                <th class="px-4 py-3 font-medium">模型名称</th>
                <th class="px-4 py-3 font-medium">所属项目</th>
                <th class="px-4 py-3 font-medium">更新时间</th>
                <th class="px-4 py-3 font-medium">状态</th>
                <th class="px-4 py-3 font-medium text-center">评论数</th>
                <th class="px-4 py-3 font-medium text-center">版本数</th>
                <th class="px-4 py-3 font-medium text-right">操作</th>
              </tr>
            </thead>
            <tbody class="text-sm text-[#333] divide-y divide-gray-100">
              <template v-if="loading">
                <tr v-for="i in 5" :key="i" class="animate-pulse">
                  <td class="px-4 py-3"><div class="h-10 w-48 bg-gray-200 rounded-lg"></div></td>
                  <td class="px-4 py-3"><div class="h-4 w-24 bg-gray-200 rounded"></div></td>
                  <td class="px-4 py-3"><div class="h-4 w-24 bg-gray-200 rounded"></div></td>
                  <td class="px-4 py-3"><div class="h-4 w-12 bg-gray-200 rounded"></div></td>
                  <td class="px-4 py-3"><div class="h-4 w-12 bg-gray-200 rounded mx-auto"></div></td>
                  <td class="px-4 py-3"><div class="h-4 w-12 bg-gray-200 rounded mx-auto"></div></td>
                  <td class="px-4 py-3"><div class="h-4 w-8 bg-gray-200 rounded ml-auto"></div></td>
                </tr>
              </template>
              <template v-else-if="models.length > 0">
                <tr
                  v-for="model in filteredModels"
                  :key="model.id"
                  class="hover:bg-[#fcfcfc] transition-colors cursor-pointer relative"
                  @click="openModelDetail(model)"
                >
                  <td class="px-4 py-3">
                    <div class="flex items-center space-x-3">
                      <div
                        class="w-10 h-10 rounded-[8px] bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden border border-gray-200"
                      >
                        <div v-if="model.previewUrl" class="w-full h-full">
                          <PreviewImage :preview-url="model.previewUrl" />
                        </div>
                        <CubeIcon v-else class="h-4 w-4 text-gray-400" />
                      </div>
                      <span class="font-medium whitespace-pre-line">{{ model.title }}</span>
                    </div>
                  </td>
                  <td class="px-4 py-3 text-gray-500">
                    {{ model.streamName || '未分配项目' }}
                  </td>
                  <td class="px-4 py-3 text-gray-500">
                    {{ formatDate(model.updateTime) }}
                  </td>
                  <td class="px-4 py-3">
                    <span v-if="model.status" class="text-red-500 text-xs">{{ model.status }}</span>
                    <span v-else class="text-green-600 text-xs">正常</span>
                  </td>
                  <td class="px-4 py-3 text-center text-gray-500">{{ model.comments }}</td>
                  <td class="px-4 py-3 text-center text-gray-500">{{ model.versions }}</td>
                  <td class="px-4 py-3 text-right relative">
                    <button
                      class="text-gray-400 hover:text-gray-600 p-1 action-menu-trigger"
                      @click.stop="toggleActionMenu(model, $event)"
                    >
                      <EllipsisHorizontalIcon class="h-4 w-4" />
                    </button>
                    <Teleport to="body">
                      <Transition name="fade-in">
                        <div
                          v-if="activeActionMenu === model.id"
                          :style="actionMenuStyle"
                          class="fixed w-40 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-[1000] overflow-hidden text-left action-menu-portal"
                        >
                          <button class="menu-item" @click.stop="downloadModelSource(model)">
                            <ArrowDownTrayIcon class="w-3.5 h-3.5" />
                            <span>导出模型数据</span>
                          </button>
                          <button class="menu-item" @click.stop="closeActionMenu">
                            <ShareIcon class="w-3.5 h-3.5" />
                            <span>分享</span>
                          </button>
                          <button
                            v-if="hasModelOp('canEdit')"
                            class="menu-item"
                            @click.stop="closeActionMenu"
                          >
                            <PencilSquareIcon class="w-3.5 h-3.5" />
                            <span>重命名</span>
                          </button>
                          <button class="menu-item" @click.stop="closeActionMenu">
                            <ClockIcon class="w-3.5 h-3.5" />
                            <span>历史版本</span>
                          </button>
                          <button
                            v-if="hasModelOp('canFile')"
                            class="menu-item text-red-500 hover:!bg-red-50"
                            @click.stop="closeActionMenu"
                          >
                            <TrashIcon class="w-3.5 h-3.5" />
                            <span>删除</span>
                          </button>
                        </div>
                      </Transition>
                    </Teleport>
                  </td>
                </tr>
              </template>
              <tr v-else>
                <td colspan="7" class="py-24 text-center">
                  <div class="flex flex-col items-center justify-center opacity-40">
                    <CubeIcon class="h-12 w-12 mb-4 text-gray-300" />
                    <p class="text-gray-400 font-medium">暂无匹配的模型数据</p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Pagination -->
      <div
        v-if="!loading"
        class="h-14 border-t border-gray-100 flex items-center justify-end px-6 shrink-0 bg-white/80 backdrop-blur-md"
      >
        <div class="flex items-center space-x-4 text-sm text-gray-500">
          <span>
            共 {{ totalRecords }} 条记录 / 第 {{ startRecord }} - {{ endRecord }} 条
          </span>
          <div class="flex items-center space-x-1">
            <button
              class="p-1 border border-gray-200 rounded-[8px] text-gray-400 hover:text-[#00b4b6] hover:border-[#00b4b6] disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="currentPage <= 1"
              @click="changePage(currentPage - 1)"
            >
              <ChevronLeftIcon class="w-4 h-4" />
            </button>
            <template v-for="page in visiblePages" :key="page">
              <button
                v-if="page === '...'"
                class="w-8 h-8 flex items-center justify-center border-0 text-gray-400"
                disabled
              >
                <EllipsisHorizontalIcon class="w-4 h-4" />
              </button>
              <button
                v-else
                class="w-8 h-8 flex items-center justify-center border rounded hover:border-[#00b4b6] hover:text-[#00b4b6] transition-colors"
                :class="
                  page === currentPage
                    ? 'border-[#00b4b6] text-[#00b4b6] bg-[#e6f7f8]'
                    : 'border-gray-200 text-gray-600'
                "
                @click="changePage(page as number)"
              >
                {{ page }}
              </button>
            </template>
            <button
              class="p-1 border border-gray-200 rounded text-gray-600 hover:text-[#00b4b6] hover:border-[#00b4b6] disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="currentPage >= totalPages"
              @click="changePage(currentPage + 1)"
            >
              <ChevronRightIcon class="w-4 h-4" />
            </button>
          </div>
          <div ref="pageSizeSelectRef" class="relative" @click.stop>
            <button
              type="button"
              class="px-3 py-1 border border-[#00b4b6] rounded-[8px] text-sm text-gray-600 bg-white cursor-pointer transition-colors hover:bg-[#00b4b6]/5 flex items-center justify-between min-w-[88px]"
              @click="pageSizeDropdownOpen = !pageSizeDropdownOpen"
            >
              <span class="truncate">{{ currentPageSize }}/页</span>
              <ChevronDownIcon
                class="w-4 h-4 text-[#00b4b6] transition-transform shrink-0 ml-2"
                :class="pageSizeDropdownOpen ? 'rotate-180' : ''"
              />
            </button>
            <Transition name="fade-down">
              <div
                v-if="pageSizeDropdownOpen"
                class="absolute right-0 bottom-full mb-1 w-full bg-white border border-[#00b4b6] rounded-[8px] shadow-lg z-50 overflow-hidden py-1 min-w-[88px]"
              >
                <button
                  v-for="size in pageSizeOptions"
                  :key="size"
                  type="button"
                  class="w-full px-3 py-2 text-sm cursor-pointer transition-colors text-left whitespace-nowrap"
                  :class="
                    currentPageSize === size
                      ? 'bg-[#00b4b6] text-white'
                      : 'text-gray-600 hover:bg-[#e6f7f8] hover:text-[#00b4b6]'
                  "
                  @click="selectPageSize(size)"
                >
                  {{ size }}/页
                </button>
              </div>
            </Transition>
          </div>
        </div>
      </div>

      <!-- Error State -->
      <div
        v-if="error"
        class="fixed bottom-8 left-1/2 -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-xl shadow-xl flex items-center space-x-3 z-[100]"
      >
        <ExclamationCircleIcon class="w-5 h-5" />
        <span class="font-medium">{{ error }}</span>
        <button
          class="bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg text-xs font-medium transition-colors"
          @click="retryFetch"
        >
          重试
        </button>
      </div>
    </div>
    <UploadsDialog
      v-if="selectedUploadModel"
      v-model:open="uploadsDialogOpen"
      :project-id="selectedUploadModel.projectId"
      :model-id="selectedUploadModel.id"
      title="选择要下载的版本"
      :use-auth-download="true"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useApolloClient } from '@vue/apollo-composable'
import {
  MagnifyingGlassIcon,
  CubeIcon,
  ChevronDownIcon,
  EllipsisHorizontalIcon,
  ArrowDownTrayIcon,
  ShareIcon,
  PencilSquareIcon,
  TrashIcon,
  ClockIcon,
  ChatBubbleLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ExclamationCircleIcon
} from '@heroicons/vue/24/outline'
import UploadsDialog from '~~/components/project/page/models/UploadsDialog.vue'
import {
  GetModelUploadsDocument,
  type GetModelUploadsQuery
} from '~~/lib/common/generated/gql/graphql'
import { useUserPermissions } from '~~/lib/auth/composables/userPermissions'
import { useApiOrigin } from '~~/composables/env'
import { useFileDownload } from '~~/lib/core/composables/fileUpload'
import { ensureError } from '@speckle/shared'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

const { ensureLoaded: ensureUserPermsLoaded, hasModelOp } = useUserPermissions()
void ensureUserPermsLoaded()

interface Model {
  id: string
  title: string
  projectId: string
  streamName?: string
  previewUrl?: string | null
  sourceFileId?: string | null
  sourceFileName?: string | null
  updateTime: string
  comments: number
  versions: number
  status?: string
  hasModel: boolean
}

const searchQuery = ref('')
const memberFilter = ref('all')
const sourceFilter = ref('all')
const memberOpen = ref(false)
const sourceOpen = ref(false)
const activeActionMenu = ref<string | null>(null)
const models = ref<Model[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const uploadsDialogOpen = ref(false)
const selectedUploadModel = ref<Model | null>(null)

const memberSelectRef = ref<HTMLElement | null>(null)
const sourceSelectRef = ref<HTMLElement | null>(null)
const pageSizeSelectRef = ref<HTMLElement | null>(null)
const actionMenuStyle = ref<Record<string, string>>({})

// 分页状态
const currentPage = ref(1)
const currentPageSize = ref(20)
const totalRecords = ref(0)
const pageSizeDropdownOpen = ref(false)
const pageSizeOptions = [20, 50, 100]

const totalPages = computed(() =>
  Math.max(1, Math.ceil(totalRecords.value / currentPageSize.value))
)
const startRecord = computed(() =>
  totalRecords.value === 0 ? 0 : (currentPage.value - 1) * currentPageSize.value + 1
)
const endRecord = computed(() =>
  Math.min(currentPage.value * currentPageSize.value, totalRecords.value)
)
const visiblePages = computed<(number | string)[]>(() => {
  const pages: (number | string)[] = []
  const total = totalPages.value
  const current = currentPage.value
  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i)
  } else if (current <= 4) {
    for (let i = 1; i <= 5; i++) pages.push(i)
    pages.push('...')
    pages.push(total)
  } else if (current >= total - 3) {
    pages.push(1)
    pages.push('...')
    for (let i = total - 4; i <= total; i++) pages.push(i)
  } else {
    pages.push(1)
    pages.push('...')
    for (let i = current - 1; i <= current + 1; i++) pages.push(i)
    pages.push('...')
    pages.push(total)
  }
  return pages
})
const router = useRouter()
const apollo = useApolloClient().client
const { downloadWithAuth } = useFileDownload()
const { triggerNotification } = useGlobalToast()

const memberOptions = [
  { value: 'all', label: '所有成员' },
  { value: 'mine', label: '我的模型' }
]
const sourceOptions = [
  { value: 'all', label: '所有来源' },
  { value: 'local', label: '本地上传' },
  { value: 'plugin', label: '插件同步' }
]

const fetchModels = async () => {
  loading.value = true
  error.value = null
  try {
    const apiOrigin = useApiOrigin()
    const response = await $fetch<{ data: Model[]; total?: number }>(
      `${apiOrigin}/api/v1/models`,
      {
        params: {
          search: searchQuery.value,
          page: currentPage.value,
          pageSize: currentPageSize.value
        }
      }
    )
    models.value = response.data || []
    totalRecords.value = response.total ?? models.value.length
  } catch {
    error.value = '连接服务器失败'
  } finally {
    loading.value = false
  }
}

// Simple debounce
let timeout: ReturnType<typeof setTimeout> | undefined
const debouncedFetch = () => {
  clearTimeout(timeout)
  timeout = setTimeout(() => {
    currentPage.value = 1
    fetchModels()
  }, 400)
}

const filteredModels = computed(() => models.value)

const formatDate = (date: string) => {
  return dayjs(date).fromNow()
}

const openModelDetail = (model: Model) => {
  router.push(`/projects/${model.projectId}/models/${model.id}`)
}

const openUploadsDialog = (model: Model) => {
  selectedUploadModel.value = model
  uploadsDialogOpen.value = true
}

const downloadModelSource = async (model: Model) => {
  closeActionMenu()

  if (model.versions > 1) {
    openUploadsDialog(model)
    return
  }

  if (!model.sourceFileId || !model.sourceFileName) {
    try {
      const result = (await apollo.query({
        query: GetModelUploadsDocument,
        variables: {
          projectId: model.projectId,
          modelId: model.id,
          input: {
            cursor: null,
            limit: 2
          }
        },
        fetchPolicy: 'no-cache'
      })) as { data?: GetModelUploadsQuery }

      const uploads = result.data?.project?.model.uploads.items || []
      if (uploads.length > 1) {
        openUploadsDialog(model)
        return
      }

      const upload = uploads[0]
      if (upload?.id && upload.fileName) {
        await downloadWithAuth({
          blobId: upload.id,
          fileName: upload.fileName,
          projectId: model.projectId
        })
        return
      }
    } catch (e) {
      triggerNotification({
        type: ToastNotificationType.Danger,
        title: '加载版本列表失败',
        description: ensureError(e).message
      })
      return
    }

    triggerNotification({
      type: ToastNotificationType.Info,
      title: '暂无可下载源文件',
      description: '该模型当前没有可下载的源文件。'
    })
    return
  }

  try {
    await downloadWithAuth({
      blobId: model.sourceFileId,
      fileName: model.sourceFileName,
      projectId: model.projectId
    })
  } catch (e) {
    triggerNotification({
      type: ToastNotificationType.Danger,
      title: '模型下载失败',
      description: ensureError(e).message
    })
  }
}

const toggleActionMenu = (model: Model, event: MouseEvent) => {
  if (activeActionMenu.value === model.id) {
    closeActionMenu()
    return
  }
  const btn = event.currentTarget as HTMLElement
  const rect = btn.getBoundingClientRect()
  const menuWidth = 160 // w-40
  // 估算菜单高度：最多 5 项 × ~36px + py-1 padding ≈ 200px，留 8px 安全间距
  const menuHeight = 220
  const gap = 4
  const safeMargin = 8

  const spaceBelow = window.innerHeight - rect.bottom
  const spaceAbove = rect.top
  // 下方放不下且上方更宽裕 → 翻转到按钮上方
  const flipUp = spaceBelow < menuHeight + gap + safeMargin && spaceAbove > spaceBelow
  const top = flipUp
    ? Math.max(safeMargin, rect.top - menuHeight - gap)
    : rect.bottom + gap

  const left = Math.min(
    Math.max(safeMargin, rect.right - menuWidth),
    window.innerWidth - menuWidth - safeMargin
  )

  actionMenuStyle.value = {
    top: `${top}px`,
    left: `${left}px`
  }
  activeActionMenu.value = model.id
}

const closeActionMenu = () => {
  activeActionMenu.value = null
}

const toggleMemberMenu = () => {
  memberOpen.value = !memberOpen.value
}

const selectMemberFilter = (val: string) => {
  memberFilter.value = val
  memberOpen.value = false
  fetchModels()
}

const toggleSourceMenu = () => {
  sourceOpen.value = !sourceOpen.value
}

const selectSourceFilter = (val: string) => {
  sourceFilter.value = val
  sourceOpen.value = false
  fetchModels()
}

const retryFetch = () => {
  fetchModels()
}

const changePage = async (page: number) => {
  if (page < 1 || page > totalPages.value || page === currentPage.value) return
  currentPage.value = page
  await fetchModels()
}

const selectPageSize = async (size: number) => {
  pageSizeDropdownOpen.value = false
  if (currentPageSize.value === size) return
  currentPageSize.value = size
  currentPage.value = 1
  await fetchModels()
}

const handleClickOutside = (e: MouseEvent) => {
  if (memberSelectRef.value && !memberSelectRef.value.contains(e.target as Node)) {
    memberOpen.value = false
  }
  if (sourceSelectRef.value && !sourceSelectRef.value.contains(e.target as Node)) {
    sourceOpen.value = false
  }
  if (
    pageSizeSelectRef.value &&
    !pageSizeSelectRef.value.contains(e.target as Node)
  ) {
    pageSizeDropdownOpen.value = false
  }
  if (activeActionMenu.value) {
    const target = e.target as HTMLElement
    if (!target.closest('.action-menu-portal') && !target.closest('.action-menu-trigger')) {
      closeActionMenu()
    }
  }
}

const handleScrollClose = () => {
  if (activeActionMenu.value) closeActionMenu()
}

onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside)
  window.addEventListener('scroll', handleScrollClose, true)
  window.addEventListener('resize', handleScrollClose)
  fetchModels()
})

onUnmounted(() => {
  document.removeEventListener('mousedown', handleClickOutside)
  window.removeEventListener('scroll', handleScrollClose, true)
  window.removeEventListener('resize', handleScrollClose)
})
</script>

<style scoped>
.menu-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  font-size: 13px;
  color: #4b5563;
  transition: all 0.2s;
  text-align: left;
}

.menu-item:hover {
  background: #f5f7fa;
  color: #00b4b6;
}

/* Transitions */
.fade-down-enter-active,
.fade-down-leave-active {
  transition: all 0.2s ease;
}
.fade-down-enter-from,
.fade-down-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.fade-in-enter-active,
.fade-in-leave-active {
  transition: all 0.15s ease;
}
.fade-in-enter-from,
.fade-in-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

/* Custom Scrollbar */
::-webkit-scrollbar {
  width: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: #e5e7eb;
  border-radius: 10px;
}
::-webkit-scrollbar-thumb:hover {
  background: #d1d5db;
}
</style>
