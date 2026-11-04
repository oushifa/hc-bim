<template>
  <div class="h-full">
    <!-- Header -->
    <div class="pt-3 pb-3 flex items-center justify-between bg-gray-50">
      <!-- <ClipboardDocumentListIcon class="h-5 w-5 text-[#00b4b6]" /> -->
      <h2 class="text-heading pl-5">日志管理</h2>
      <button
        :disabled="isLoading"
        class="flex items-center space-x-1 bg-white/80 backdrop-blur-md border border-gray-200 text-gray-600 hover:text-[#00b4b6] hover:border-[#00b4b6] px-3 py-1.5 rounded-[8px] text-sm font-medium transition-colors mr-5"
        @click="refreshLogs"
      >
        <ArrowPathIcon class="w-4 h-4" :class="{ 'animate-spin': isLoading }" />
        <span>{{ isLoading ? '加载中...' : '刷新日志' }}</span>
      </button>
    </div>

    <!-- Main Content Card -->
    <div
      class="bg-white overflow-hidden flex flex-col"
      style="height: calc(100vh - 11rem)"
    >
      <!-- Toolbar: Tabs + Search + Filter -->
      <div
        class="h-[4.5rem] px-5 border-t border-b border-gray-100 flex items-center justify-between shrink-0 bg-white"
      >
        <!-- Tabs -->
        <div
          class="flex space-x-1 bg-[#f5f7fa] p-1 rounded-[8px] border border-gray-200"
        >
          <button
            class="px-4 py-1.5 rounded-[8px] text-sm font-medium transition-colors"
            :class="
              activeTab === 'model'
                ? 'bg-white text-[#00b4b6] shadow-sm'
                : 'text-gray-500 hover:text-[#333]'
            "
            @click="activeTab = 'model'"
          >
            模型操作日志
          </button>
          <button
            class="px-4 py-1.5 rounded-[8px] text-sm font-medium transition-colors"
            :class="
              activeTab === 'login'
                ? 'bg-white text-[#00b4b6] shadow-sm'
                : 'text-gray-500 hover:text-[#333]'
            "
            @click="activeTab = 'login'"
          >
            用户登录日志
          </button>
        </div>

        <!-- Search + Filter -->
        <div class="flex items-center space-x-3">
          <div class="relative">
            <label for="logs-search-input" class="sr-only">搜索日志</label>
            <MagnifyingGlassIcon
              class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
            />
            <input
              id="logs-search-input"
              v-model="searchQuery"
              type="text"
              placeholder="搜索操作人/内容..."
              class="search-input w-56 bg-[#f5f7fa] border border-gray-200 rounded-[8px] py-1.5 pl-9 pr-4 text-sm focus:outline-none text-[#333] transition-all"
            />
          </div>
          <button
            class="p-2 bg-white border border-gray-200 rounded-[8px] text-gray-500 hover:text-[#00b4b6] hover:border-[#00b4b6] transition-colors"
            title="筛选"
          >
            <FunnelIcon class="w-4 h-4" />
          </button>
        </div>
      </div>

      <!-- Table Content -->
      <div class="flex-1 overflow-auto p-5">
        <div
          v-if="errorMessage"
          class="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600"
        >
          {{ errorMessage }}
        </div>

        <!-- 模型操作日志 -->
        <template v-if="activeTab === 'model'">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-slate-50/80 text-gray-500 text-sm border-b border-gray-100">
                <th class="py-3 pl-6 font-medium">操作时间</th>
                <th class="py-3 font-medium">操作人</th>
                <th class="py-3 font-medium">操作类型</th>
                <th class="py-3 font-medium">目标模型</th>
                <th class="py-3 font-medium">版本信息</th>
                <th class="py-3 pr-6 font-medium">IP地址</th>
              </tr>
            </thead>
            <tbody class="text-sm text-[#333]">
              <tr
                v-for="log in modelTab.items"
                :key="log.id"
                class="border-b border-gray-50 hover:bg-[#fcfcfc] transition-colors"
              >
                <td class="py-3.5 pl-6 text-gray-500">{{ log.time }}</td>
                <td class="py-3.5 font-medium">{{ log.user }}</td>
                <td class="py-3.5">
                  <span class="text-[#00b4b6]">{{ log.action }}</span>
                </td>
                <td class="py-3.5 text-gray-600">{{ log.target }}</td>
                <td class="py-3.5 text-gray-500">
                  <span
                    class="inline-block align-middle max-w-[260px] truncate px-2.5 py-1 rounded-[6px] bg-gray-100 text-xs"
                    :title="log.version"
                  >
                    {{ log.version }}
                  </span>
                </td>
                <td class="py-3.5 pr-6 text-gray-400">{{ log.ip }}</td>
              </tr>
              <tr v-if="isLoading">
                <td colspan="6" class="py-16 text-center text-gray-400 text-sm">
                  正在加载日志...
                </td>
              </tr>
              <tr v-else-if="modelTab.items.length === 0">
                <td colspan="6" class="py-16 text-center text-gray-400 text-sm">
                  暂无匹配的模型操作日志
                </td>
              </tr>
            </tbody>
          </table>
        </template>

        <!-- 用户登录日志 -->
        <template v-else>
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-slate-50/80 text-gray-500 text-sm border-b border-gray-100">
                <th class="py-3 pl-6 font-medium">登录时间</th>
                <th class="py-3 font-medium">用户</th>
                <th class="py-3 font-medium">IP地址</th>
                <th class="py-3 font-medium">登录地点</th>
                <th class="py-3 pr-6 font-medium">状态</th>
              </tr>
            </thead>
            <tbody class="text-sm text-[#333]">
              <tr
                v-for="log in loginTab.items"
                :key="log.id"
                class="border-b border-gray-50 hover:bg-[#fcfcfc] transition-colors"
              >
                <td class="py-3.5 pl-6 text-gray-500">{{ log.time }}</td>
                <td class="py-3.5 font-medium">{{ log.user }}</td>
                <td class="py-3.5 text-gray-400">{{ log.ip }}</td>
                <td class="py-3.5 text-gray-400">{{ log.location }}</td>
                <td class="py-3.5 pr-6">
                  <span
                    class="flex items-center space-x-1.5"
                    :class="log.status === '成功' ? 'text-green-600' : 'text-red-500'"
                  >
                    <span
                      class="w-1.5 h-1.5 rounded-full"
                      :class="log.status === '成功' ? 'bg-green-500' : 'bg-red-500'"
                    />
                    <span>{{ log.status }}</span>
                  </span>
                </td>
              </tr>
              <tr v-if="isLoading">
                <td colspan="5" class="py-16 text-center text-gray-400 text-sm">
                  正在加载日志...
                </td>
              </tr>
              <tr v-else-if="loginTab.items.length === 0">
                <td colspan="5" class="py-16 text-center text-gray-400 text-sm">
                  暂无匹配的用户登录日志
                </td>
              </tr>
            </tbody>
          </table>
        </template>
      </div>

      <!-- Pagination -->
      <div
        class="shrink-0 px-5 py-3 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-3 text-sm text-gray-500"
      >
        <div class="flex items-center gap-2">
          <label for="logs-page-size" class="sr-only">每页显示条数</label>
          <span>每页显示</span>
          <select
            id="logs-page-size"
            v-model.number="activePageState.pageSize"
            class="bg-[#f5f7fa] border border-gray-200 rounded-[6px] px-2 py-1 focus:outline-none focus:border-[#00b4b6]"
          >
            <option :value="10">10</option>
            <option :value="20">20</option>
            <option :value="50">50</option>
          </select>
          <span>条</span>
          <span class="ml-1">共 {{ activePageState.total }} 条</span>
        </div>
        <div class="flex items-center gap-1">
          <button
            class="px-2 py-1 rounded hover:bg-[#f5f7fa] disabled:opacity-40 disabled:cursor-not-allowed"
            :disabled="activePageState.page <= 1 || isLoading"
            @click="goPrevPage"
          >
            &lt; 上一页
          </button>
          <span class="px-2">
            第 {{ activePageState.page }} / {{ activeTotalPages }} 页
          </span>
          <button
            class="px-2 py-1 rounded hover:bg-[#f5f7fa] disabled:opacity-40 disabled:cursor-not-allowed"
            :disabled="activePageState.page >= activeTotalPages || isLoading"
            @click="goNextPage"
          >
            下一页 &gt;
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowPathIcon
} from '@heroicons/vue/24/outline'
import { useDebounceFn } from '@vueuse/core'
import { useAuthCookie } from '~~/lib/auth/composables/auth'

// ─── Tab 状态 ────────────────────────────────────────────────
const activeTab = ref<'model' | 'login'>('model')
const searchQuery = ref('')
const debouncedSearch = ref('')
const isLoading = ref(false)
const errorMessage = ref('')
const authToken = useAuthCookie()

type LogApiEvent = {
  eventId?: string
  eventTime?: string
  what?: {
    action?: string
    targetId?: string | null
    payloadSummary?: Record<string, unknown> | string | null
  }
  who?: {
    userId?: string | null
    user?: {
      id?: string | null
      name?: string | null
      email?: string | null
    } | null
    ip?: string | null
  }
  where?: {
    route?: string | null
    page?: string | null
    module?: string | null
  }
  result?: {
    status?: 'success' | 'fail' | 'unknown'
    message?: string | null
  }
  metadata?: {
    opType?: string
    operatorDept?: string
    target?: string
    detail?: string
    location?: string
  } | null
}

type LogsApiResponse = {
  items: LogApiEvent[]
  total: number
  page: number
  pageSize: number
}

type ModelLogItem = {
  id: string
  time: string
  user: string
  action: string
  target: string
  version: string
  ip: string
}

type LoginLogItem = {
  id: string
  time: string
  user: string
  ip: string
  location: string
  status: string
}

type TabState = {
  page: number
  pageSize: number
  total: number
  items: ModelLogItem[] | LoginLogItem[]
}

const modelTab = reactive<TabState>({
  page: 1,
  pageSize: 10,
  total: 0,
  items: []
}) as TabState & { items: ModelLogItem[] }
const loginTab = reactive<TabState>({
  page: 1,
  pageSize: 10,
  total: 0,
  items: []
}) as TabState & { items: LoginLogItem[] }

const activePageState = computed(() =>
  activeTab.value === 'model' ? modelTab : loginTab
)
const activeTotalPages = computed(() =>
  Math.max(1, Math.ceil(activePageState.value.total / activePageState.value.pageSize))
)

const formatTime = (value?: string) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('zh-CN', { hour12: false })
}

const getDisplayUserName = (event: LogApiEvent) => {
  return (
    event.who?.user?.name || event.who?.user?.email || event.who?.userId || '未知用户'
  )
}

const toModelLogItem = (event: LogApiEvent, index: number): ModelLogItem => {
  const action = event.metadata?.opType || event.what?.action || '-'

  return {
    id: event.eventId || `${event.eventTime || 'model'}-${index}`,
    time: formatTime(event.eventTime),
    user: getDisplayUserName(event),
    action,
    target: event.metadata?.target || event.what?.targetId || '-',
    version: event.metadata?.detail || '-',
    ip: event.who?.ip || '-'
  }
}

const toLoginLogItem = (event: LogApiEvent, index: number): LoginLogItem => {
  const status = event.result?.status || 'unknown'
  const statusText =
    status === 'success'
      ? '成功'
      : status === 'fail'
      ? `失败${event.result?.message ? ` (${event.result.message})` : ''}`
      : '未知'

  return {
    id: event.eventId || `${event.eventTime || 'login'}-${index}`,
    time: formatTime(event.eventTime),
    user: getDisplayUserName(event),
    ip: event.who?.ip || '-',
    location: String(
      event.metadata?.location || event.where?.page || event.where?.route || '未知'
    ),
    status: statusText
  }
}

const buildHeaders = (): HeadersInit => {
  const headers: HeadersInit = { 'Content-Type': 'application/json' }
  const token = authToken.value
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
}

const fetchLogs = async (tab: 'model' | 'login') => {
  const target = tab === 'model' ? modelTab : loginTab

  isLoading.value = true
  errorMessage.value = ''
  try {
    const query = new URLSearchParams({
      type: tab,
      page: String(target.page),
      pageSize: String(target.pageSize)
    })
    if (debouncedSearch.value) query.set('q', debouncedSearch.value)

    const response = await fetch(
      `${useApiOrigin()}/api/v1/logs/events?${query.toString()}`,
      {
        method: 'GET',
        headers: buildHeaders()
      }
    )
    if (!response.ok) {
      throw new Error(`日志加载失败（${response.status}）`)
    }

    const payload = (await response.json()) as LogsApiResponse
    const items = Array.isArray(payload.items) ? payload.items : []

    if (tab === 'model') {
      modelTab.total = Number(payload.total || 0)
      modelTab.items = items.map(toModelLogItem)
    } else {
      loginTab.total = Number(payload.total || 0)
      loginTab.items = items.map(toLoginLogItem)
    }
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : '日志加载失败，请稍后重试。'
    if (tab === 'model') {
      modelTab.items = []
      modelTab.total = 0
    } else {
      loginTab.items = []
      loginTab.total = 0
    }
  } finally {
    isLoading.value = false
  }
}

const refreshLogs = () => {
  void fetchLogs(activeTab.value)
}

const goPrevPage = () => {
  if (activePageState.value.page <= 1) return
  activePageState.value.page -= 1
}

const goNextPage = () => {
  if (activePageState.value.page >= activeTotalPages.value) return
  activePageState.value.page += 1
}

const updateDebouncedSearch = useDebounceFn((value: string) => {
  debouncedSearch.value = value.trim()
  modelTab.page = 1
  loginTab.page = 1
}, 300)

watch(searchQuery, (value) => {
  updateDebouncedSearch(value)
})

// 切换 Tab、翻页、修改每页条数或搜索词时，均按当前 Tab 重新向后端请求
watch(
  () =>
    [
      activeTab.value,
      activePageState.value.page,
      activePageState.value.pageSize,
      debouncedSearch.value
    ].join('|'),
  () => {
    void fetchLogs(activeTab.value)
  },
  { immediate: true }
)
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
</style>
