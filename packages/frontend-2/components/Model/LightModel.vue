<template>
  <div
    class="h-full flex flex-col bg-slate-50/50 backdrop-blur-xl rounded-[32px] shadow-2xl overflow-hidden border border-white/40"
  >
    <!-- Header & Toolbar -->
    <div
      class="px-8 py-6 border-b border-slate-200/50 flex flex-col lg:flex-row lg:items-center justify-between gap-6 shrink-0 bg-white/30"
    >
      <div class="flex items-center space-x-3">
        <div
          class="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00b4b6] to-[#008a8c] flex items-center justify-center shadow-lg shadow-primary/20"
        >
          <CubeIcon class="h-6 w-6 text-white" />
        </div>
        <div>
          <h2
            class="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600"
          >
            轻量模型
          </h2>
          <p class="text-xs text-slate-500 font-medium opacity-70">
            管理与查看您的BIM模型
          </p>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-4">
        <!-- Search -->
        <div class="relative group">
          <label for="model-search" class="sr-only">搜索模型</label>
          <input
            id="model-search"
            v-model="searchQuery"
            type="text"
            placeholder="搜索模型..."
            class="w-64 bg-white/60 border-slate-200 border rounded-xl py-2.5 pl-4 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-300 placeholder:text-slate-400 shadow-sm group-hover:shadow-md"
            @input="debouncedFetch"
          />
          <MagnifyingGlassIcon
            class="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-hover:text-primary transition-colors"
          />
        </div>

        <!-- Custom Dropdowns -->
        <div class="flex items-center gap-3">
          <div ref="memberSelectRef" class="relative w-36">
            <div
              class="w-full px-4 py-2.5 bg-white/60 border border-slate-200 rounded-xl text-sm flex items-center justify-between cursor-pointer transition-all hover:shadow-md hover:border-primary/30 text-slate-600 font-medium"
              @click="toggleMemberMenu"
            >
              <span class="truncate">
                {{ memberOptions.find((o) => o.value === memberFilter)?.label }}
              </span>
              <ChevronDownIcon
                :class="[
                  'w-4 h-4 text-slate-400 transition-transform duration-300',
                  memberOpen ? 'rotate-180' : ''
                ]"
              />
            </div>
            <Transition name="fade-down">
              <div
                v-if="memberOpen"
                class="absolute top-full left-0 mt-2 w-full bg-white/90 backdrop-blur-md border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden py-1 ring-1 ring-black/5"
              >
                <div
                  v-for="opt in memberOptions"
                  :key="opt.value"
                  class="px-4 py-2.5 text-sm cursor-pointer transition-colors"
                  :class="
                    memberFilter === opt.value
                      ? 'bg-primary text-white'
                      : 'text-slate-600 hover:bg-primary/10 hover:text-primary'
                  "
                  @click="selectMemberFilter(opt.value)"
                >
                  {{ opt.label }}
                </div>
              </div>
            </Transition>
          </div>

          <div ref="sourceSelectRef" class="relative w-36">
            <div
              class="w-full px-4 py-2.5 bg-white/60 border border-slate-200 rounded-xl text-sm flex items-center justify-between cursor-pointer transition-all hover:shadow-md hover:border-primary/30 text-slate-600 font-medium"
              @click="toggleSourceMenu"
            >
              <span class="truncate">
                {{ sourceOptions.find((o) => o.value === sourceFilter)?.label }}
              </span>
              <ChevronDownIcon
                :class="[
                  'w-4 h-4 text-slate-400 transition-transform duration-300',
                  sourceOpen ? 'rotate-180' : ''
                ]"
              />
            </div>
            <Transition name="fade-down">
              <div
                v-if="sourceOpen"
                class="absolute top-full left-0 mt-2 w-full bg-white/90 backdrop-blur-md border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden py-1 ring-1 ring-black/5"
              >
                <div
                  v-for="opt in sourceOptions"
                  :key="opt.value"
                  class="px-4 py-2.5 text-sm cursor-pointer transition-colors"
                  :class="
                    sourceFilter === opt.value
                      ? 'bg-primary text-white'
                      : 'text-slate-600 hover:bg-primary/10 hover:text-primary'
                  "
                  @click="selectSourceFilter(opt.value)"
                >
                  {{ opt.label }}
                </div>
              </div>
            </Transition>
          </div>
        </div>

        <!-- Action Button -->
        <button
          v-if="hasModelOp('canUpload')"
          class="bg-primary hover:bg-primary-dark text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0"
        >
          新建模型
        </button>
      </div>
    </div>

    <!-- Content Area -->
    <div class="flex-1 overflow-auto bg-slate-50/30 p-8">
      <div
        class="premium-card bg-white/70 backdrop-blur-md border border-white/60 rounded-2xl overflow-hidden shadow-sm"
      >
        <table class="w-full text-left border-collapse">
          <thead>
            <tr
              class="bg-slate-100/50 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-slate-200/50"
            >
              <th class="px-6 py-4 font-semibold">模型信息</th>
              <th class="px-6 py-4 font-semibold">所属项目</th>
              <th class="px-6 py-4 font-semibold">更新时间</th>
              <th class="px-6 py-4 font-semibold text-center">版本</th>
              <th class="px-6 py-4 font-semibold text-center">评论</th>
              <th class="px-6 py-4 font-semibold text-right">操作</th>
            </tr>
          </thead>
          <tbody class="text-sm text-slate-700 divide-y divide-slate-100/50 relative">
            <template v-if="loading">
              <tr v-for="i in 5" :key="i" class="animate-pulse">
                <td class="px-6 py-5">
                  <div class="h-10 w-48 bg-slate-200 rounded-lg"></div>
                </td>
                <td class="px-6 py-5">
                  <div class="h-4 w-32 bg-slate-200 rounded-md"></div>
                </td>
                <td class="px-6 py-5">
                  <div class="h-4 w-24 bg-slate-200 rounded-md"></div>
                </td>
                <td class="px-6 py-5">
                  <div class="h-4 w-12 bg-slate-200 rounded-md mx-auto"></div>
                </td>
                <td class="px-6 py-5">
                  <div class="h-4 w-12 bg-slate-200 rounded-md mx-auto"></div>
                </td>
                <td class="px-6 py-5">
                  <div class="h-4 w-8 bg-slate-200 rounded-md ml-auto"></div>
                </td>
              </tr>
            </template>
            <template v-else-if="models.length > 0">
              <tr
                v-for="model in filteredModels"
                :key="model.id"
                class="group hover:bg-white transition-all duration-300 cursor-pointer relative"
                @click="openModelDetail(model)"
              >
                <td class="px-6 py-5">
                  <div class="flex items-center space-x-4">
                    <div
                      class="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden border border-slate-200 group-hover:border-primary/30 transition-colors shadow-inner"
                    >
                      <img
                        v-if="model.hasModel"
                        src="https://images.unsplash.com/photo-1581094794329-c8112a89af12?q=80&w=100&auto=format&fit=crop"
                        alt="thumbnail"
                        class="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                      />
                      <CubeIcon v-else class="h-5 w-5 text-slate-300" />
                    </div>
                    <div class="flex flex-col">
                      <span
                        class="font-bold text-slate-800 group-hover:text-primary transition-colors"
                      >
                        {{ model.title }}
                      </span>
                      <div class="flex items-center space-x-2 mt-0.5">
                        <span
                          v-if="model.status"
                          class="status-badge bg-rose-100 text-rose-600"
                        >
                          {{ model.status }}
                        </span>
                        <span
                          v-else
                          class="status-badge bg-emerald-100 text-emerald-600"
                        >
                          Active
                        </span>
                      </div>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-5">
                  <span class="text-slate-500 font-medium">
                    {{ model.streamName || '未分配项目' }}
                  </span>
                </td>
                <td class="px-6 py-5 text-slate-500 font-medium">
                  {{ formatDate(model.updateTime) }}
                </td>
                <td class="px-6 py-5 text-center">
                  <div
                    class="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 font-bold text-xs"
                  >
                    <ClockIcon class="w-3.5 h-3.5" />
                    <span>{{ model.versions }}</span>
                  </div>
                </td>
                <td class="px-6 py-5 text-center">
                  <div
                    class="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 font-bold text-xs"
                  >
                    <ChatBubbleLeftIcon class="w-3.5 h-3.5" />
                    <span>{{ model.comments }}</span>
                  </div>
                </td>
                <td class="px-6 py-5 text-right relative">
                  <button
                    class="text-slate-400 hover:text-primary p-2 rounded-lg hover:bg-primary/5 transition-all"
                    @click.stop="toggleActionMenu(model.id)"
                  >
                    <EllipsisHorizontalIcon class="h-5 w-5" />
                  </button>
                  <Transition name="fade-in">
                    <div
                      v-if="activeActionMenu === model.id"
                      class="absolute right-12 top-10 w-48 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-100 py-2 z-20 ring-1 ring-black/5 overflow-hidden text-left"
                    >
                      <button class="menu-item" @click.stop="closeActionMenu">
                        <ArrowDownTrayIcon class="w-4 h-4" />
                        <span>导出模型</span>
                      </button>
                      <button class="menu-item" @click.stop="closeActionMenu">
                        <ShareIcon class="w-4 h-4" />
                        <span>共享链接</span>
                      </button>
                      <button
                        v-if="hasModelOp('canEdit')"
                        class="menu-item"
                        @click.stop="closeActionMenu"
                      >
                        <PencilSquareIcon class="w-4 h-4" />
                        <span>重命名</span>
                      </button>
                      <div class="h-px bg-slate-100 my-1"></div>
                      <button
                        v-if="hasModelOp('canFile')"
                        class="menu-item text-rose-500 hover:bg-rose-50"
                        @click.stop="closeActionMenu"
                      >
                        <TrashIcon class="w-4 h-4" />
                        <span>删除模型</span>
                      </button>
                    </div>
                  </Transition>
                </td>
              </tr>
            </template>
            <tr v-else>
              <td colspan="6" class="py-24 text-center">
                <div class="flex flex-col items-center justify-center opacity-40">
                  <CubeIcon class="h-16 w-16 mb-4 text-slate-300" />
                  <p class="text-slate-400 font-medium">暂无匹配的模型数据</p>
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
      class="fixed bottom-8 left-1/2 -translate-x-1/2 bg-rose-500 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center space-x-3 z-[100] animate-bounce"
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
    const response = await $fetch<{ data: any[] }>(`${apiOrigin}/api/v1/models`, {
      params: { search: searchQuery.value }
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

const filteredModels = computed(() => {
  // We already filter by search in the backend, but we can also do local filtering here for member/source
  const res = models.value
  if (memberFilter.value === 'mine') {
    // Mock logic for "mine"
  }
  return res
})

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
}

const toggleSourceMenu = () => {
  sourceOpen.value = !sourceOpen.value
}

const selectSourceFilter = (val: string) => {
  sourceFilter.value = val
  sourceOpen.value = false
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
.premium-card {
  box-shadow: 0 10px 40px -10px rgba(0, 0, 0, 0.05);
}

.status-badge {
  padding: 2px 8px;
  border-radius: 9999px;
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.menu-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 500;
  color: #475569;
  transition: all 0.2s;
}

.menu-item:hover {
  background: rgba(0, 180, 182, 0.05);
  color: #00b4b6;
}

/* Transitions */
.fade-down-enter-active,
.fade-down-leave-active {
  transition: all 0.3s ease;
}
.fade-down-enter-from,
.fade-down-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.fade-in-enter-active,
.fade-in-leave-active {
  transition: all 0.2s ease;
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
  background: #e2e8f0;
  border-radius: 10px;
}
::-webkit-scrollbar-thumb:hover {
  background: #cbd5e1;
}
</style>
