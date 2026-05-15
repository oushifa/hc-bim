<template>
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
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索模型..."
            class="search-input w-48 bg-[#f5f7fa] border border-gray-200 rounded-[8px] py-1.5 pl-3 pr-8 text-sm focus:outline-none text-[#333] transition-all placeholder:text-gray-400"
            @input="debouncedFetch"
          />
          <MagnifyingGlassIcon
            class="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
          />
        </div>

        <!-- Custom Dropdowns -->
        <div ref="memberSelectRef" class="relative w-32">
          <div
            class="w-full px-3 py-1.5 border rounded-[8px] text-sm flex items-center justify-between cursor-pointer transition-colors text-gray-600"
            :class="memberFilter === 'all' ? 'border-transparent bg-gray-50' : 'border-[#00b4b6] bg-white'"
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
          </div>
          <Transition name="fade-down">
            <div
              v-if="memberOpen"
              class="absolute top-full left-0 mt-1 w-full bg-white border border-[#00b4b6] rounded-[8px] shadow-lg z-50 overflow-hidden py-1"
            >
              <div
                v-for="opt in memberOptions"
                :key="opt.value"
                class="px-3 py-2 text-sm cursor-pointer transition-colors"
                :class="
                  memberFilter === opt.value
                    ? 'bg-[#00b4b6] text-white'
                    : 'text-gray-600 hover:bg-[#e6f7f8] hover:text-[#00b4b6]'
                "
                @click="selectMemberFilter(opt.value)"
              >
                {{ opt.label }}
              </div>
            </div>
          </Transition>
        </div>

        <div ref="sourceSelectRef" class="relative w-32">
          <div
            class="w-full px-3 py-1.5 border rounded-[8px] text-sm flex items-center justify-between cursor-pointer transition-colors text-gray-600"
            :class="sourceFilter === 'all' ? 'border-transparent bg-gray-50' : 'border-[#00b4b6] bg-white'"
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
          </div>
          <Transition name="fade-down">
            <div
              v-if="sourceOpen"
              class="absolute top-full left-0 mt-1 w-full bg-white border border-[#00b4b6] rounded-[8px] shadow-lg z-50 overflow-hidden py-1"
            >
              <div
                v-for="opt in sourceOptions"
                :key="opt.value"
                class="px-3 py-2 text-sm cursor-pointer transition-colors"
                :class="
                  sourceFilter === opt.value
                    ? 'bg-[#00b4b6] text-white'
                    : 'text-gray-600 hover:bg-[#e6f7f8] hover:text-[#00b4b6]'
                "
                @click="selectSourceFilter(opt.value)"
              >
                {{ opt.label }}
              </div>
            </div>
          </Transition>
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
      <div class="bg-white/80 backdrop-blur-md border border-gray-200 rounded-[8px]">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-[#f8f9fa] text-gray-500 text-sm border-b border-gray-200">
              <th class="px-4 py-3 font-medium">模型名称</th>
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
                <td class="px-4 py-3">
                  <div class="h-10 w-48 bg-gray-200 rounded-md"></div>
                </td>
                <td class="px-4 py-3">
                  <div class="h-4 w-24 bg-gray-200 rounded-md"></div>
                </td>
                <td class="px-4 py-3">
                  <div class="h-4 w-16 bg-gray-200 rounded-md"></div>
                </td>
                <td class="px-4 py-3">
                  <div class="h-4 w-12 bg-gray-200 rounded-md mx-auto"></div>
                </td>
                <td class="px-4 py-3">
                  <div class="h-4 w-12 bg-gray-200 rounded-md mx-auto"></div>
                </td>
                <td class="px-4 py-3">
                  <div class="h-4 w-8 bg-gray-200 rounded-md ml-auto"></div>
                </td>
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
                    <div class="w-10 h-10 rounded-[8px] bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden border border-gray-200">
                      <img
                        v-if="model.previewUrl"
                        :src="model.previewUrl"
                        alt="thumbnail"
                        class="w-full h-full object-cover"
                      />
                      <CubeIcon v-else class="h-4 w-4 text-gray-400" />
                    </div>
                    <span class="font-medium whitespace-pre-line">{{ model.title }}</span>
                  </div>
                </td>
                <td class="px-4 py-3 text-gray-500">{{ formatDate(model.updateTime) }}</td>
                <td class="px-4 py-3">
                  <span v-if="model.status" class="text-red-500 text-xs">{{ model.status }}</span>
                  <span v-else class="text-green-600 text-xs">正常</span>
                </td>
                <td class="px-4 py-3 text-center text-gray-500">{{ model.comments }}</td>
                <td class="px-4 py-3 text-center text-gray-500">{{ model.versions }}</td>
                <td class="px-4 py-3 text-right relative">
                  <button
                    class="text-gray-400 hover:text-gray-600 p-1"
                    @click.stop="toggleActionMenu(model.id)"
                  >
                    <EllipsisHorizontalIcon class="h-4 w-4" />
                  </button>
                  <Transition name="fade-in">
                    <div
                      v-if="activeActionMenu === model.id"
                      class="absolute right-8 top-10 w-40 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-[60] overflow-hidden text-left"
                    >
                      <button class="menu-item" @click.stop="closeActionMenu">
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
                        class="menu-item text-red-500 hover:bg-red-50"
                        @click.stop="closeActionMenu"
                      >
                        <TrashIcon class="w-3.5 h-3.5" />
                        <span>删除</span>
                      </button>
                    </div>
                  </Transition>
                </td>
              </tr>
            </template>
            <tr v-else>
              <td colspan="6" class="py-24 text-center">
                <div class="flex flex-col items-center justify-center opacity-40">
                  <CubeIcon class="h-16 w-16 mb-4 text-gray-300" />
                  <p class="text-gray-400 font-medium">暂无匹配的模型数据</p>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Error State -->
    <div
      v-if="error"
      class="fixed bottom-8 left-1/2 -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center space-x-3 z-[100]"
    >
      <ExclamationCircleIcon class="w-5 h-5" />
      <span class="font-bold">{{ error }}</span>
      <button
        class="bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg text-xs font-bold transition-colors"
        @click="retryFetch"
      >
        重试
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
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
  ExclamationCircleIcon
} from '@heroicons/vue/24/outline'
import ModelDetail from './Detail.vue'
import { useUserPermissions } from '~~/lib/auth/composables/userPermissions'
import { useApiOrigin } from '~~/composables/env'
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
const selectedModel = ref<Model | null>(null)
const activeActionMenu = ref<string | null>(null)
const models = ref<Model[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

const memberSelectRef = ref<HTMLElement | null>(null)
const sourceSelectRef = ref<HTMLElement | null>(null)
const router = useRouter()

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
    const params: Record<string, string> = {}
    if (searchQuery.value) params.search = searchQuery.value
    if (memberFilter.value && memberFilter.value !== 'all') {
      params.member = memberFilter.value
    }
    if (sourceFilter.value && sourceFilter.value !== 'all') {
      params.source = sourceFilter.value
    }
    const response = await $fetch<{ data: any[] }>(`${apiOrigin}/api/v1/models`, {
      params
    })
    models.value = response.data
  } catch (e) {
    console.error('Failed to fetch models:', e)
    error.value = '连接服务器失败'
  } finally {
    loading.value = false
  }
}

// Simple debounce
let timeout: any
const debouncedFetch = () => {
  clearTimeout(timeout)
  timeout = setTimeout(fetchModels, 400)
}

const filteredModels = computed(() => models.value)

const formatDate = (date: string) => {
  return dayjs(date).fromNow()
}

const openModelDetail = (model: Model) => {
  router.push(`/projects/${model.projectId}/models/${model.id}`)
}

const toggleActionMenu = (id: string) => {
  activeActionMenu.value = activeActionMenu.value === id ? null : id
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

const closeModelDetail = () => {
  selectedModel.value = null
}

const retryFetch = () => {
  fetchModels()
}

const handleClickOutside = (e: MouseEvent) => {
  if (memberSelectRef.value && !memberSelectRef.value.contains(e.target as Node)) {
    memberOpen.value = false
  }
  if (sourceSelectRef.value && !sourceSelectRef.value.contains(e.target as Node)) {
    sourceOpen.value = false
  }
  if (activeActionMenu.value && !(e.target as HTMLElement).closest('.relative')) {
    activeActionMenu.value = null
  }
}

onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside)
  fetchModels()
})

onUnmounted(() => {
  document.removeEventListener('mousedown', handleClickOutside)
})
</script>

<style scoped>
/* 强制覆盖搜索框聚焦时的边框颜色与背景色 */
input.search-input:focus,
input.search-input:focus-visible {
  border: 1px solid #00b4b6 !important;
  background-color: #ffffff !important;
  outline: none !important;
  box-shadow: none !important;
}

.menu-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  font-size: 13px;
  color: #4b5563;
  transition: all 0.2s;
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
