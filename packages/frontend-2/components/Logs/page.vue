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
                v-for="log in filteredModelLogs"
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
                  <span class="px-2.5 py-1 rounded-[6px] bg-gray-100 text-xs">
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
              <tr v-else-if="filteredModelLogs.length === 0">
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
                v-for="log in filteredLoginLogs"
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
              <tr v-else-if="filteredLoginLogs.length === 0">
                <td colspan="5" class="py-16 text-center text-gray-400 text-sm">
                  暂无匹配的用户登录日志
                </td>
              </tr>
            </tbody>
          </table>
        </template>
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
import { useAuthCookie } from '~~/lib/auth/composables/auth'

// ─── Tab 状态 ────────────────────────────────────────────────
const activeTab = ref<'model' | 'login'>('model')
const searchQuery = ref('')
const isLoading = ref(false)
const errorMessage = ref('')
const authToken = useAuthCookie()

type RawLogEvent = {
  eventTime?: string
  action?: string
  what?: {
    action?: string
    targetType?: string | null
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
  }
  result?: {
    status?: 'success' | 'fail' | 'unknown'
    message?: string | null
  }
  metadata?: Record<string, unknown> | null
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

const modelLogs = ref<ModelLogItem[]>([])
const loginLogs = ref<LoginLogItem[]>([])

const formatTime = (value?: string) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('zh-CN', { hour12: false })
}

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {}

const parseEvents = (payload: unknown): RawLogEvent[] => {
  if (Array.isArray(payload)) return payload as RawLogEvent[]
  const root = asRecord(payload)
  const candidates = [root.events, root.items, root.data]
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate as RawLogEvent[]
  }
  return []
}

const isLoginEvent = (event: RawLogEvent) => {
  const action = event.what?.action || event.action || ''
  return action.startsWith('auth.login')
}

const getDisplayUserName = (event: RawLogEvent) => {
  return (
    event.who?.user?.name || event.who?.user?.email || event.who?.userId || '未知用户'
  )
}

const toModelLogItem = (event: RawLogEvent, index: number): ModelLogItem => {
  const action = event.what?.action || event.action || '-'
  const payload = asRecord(event.what?.payloadSummary)
  const metadata = asRecord(event.metadata)

  return {
    id: `${event.eventTime || 'model'}-${index}-${action}`,
    time: formatTime(event.eventTime),
    user: getDisplayUserName(event),
    action,
    target: String(
      event.what?.targetId ||
        payload.targetId ||
        payload.target ||
        metadata.target ||
        '-'
    ),
    version: String(payload.version || metadata.version || '-'),
    ip: event.who?.ip || '-'
  }
}

const toLoginLogItem = (event: RawLogEvent, index: number): LoginLogItem => {
  const status = event.result?.status || 'unknown'
  const statusText =
    status === 'success'
      ? '成功'
      : status === 'fail'
      ? `失败${event.result?.message ? ` (${event.result.message})` : ''}`
      : '未知'
  const metadata = asRecord(event.metadata)

  return {
    id: `${event.eventTime || 'login'}-${index}-${status}`,
    time: formatTime(event.eventTime),
    user: getDisplayUserName(event),
    ip: event.who?.ip || '-',
    location: String(
      metadata.location || event.where?.route || event.where?.page || '未知'
    ),
    status: statusText
  }
}

const refreshLogs = async () => {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const token = authToken.value
    const headers: HeadersInit = { 'Content-Type': 'application/json' }
    if (token) headers.Authorization = `Bearer ${token}`

    const response = await fetch(`${useApiOrigin()}/api/v1/logs/events?limit=300`, {
      method: 'GET',
      headers
    })
    if (!response.ok) {
      throw new Error(`日志加载失败（${response.status}）`)
    }

    const payload = (await response.json()) as unknown
    const events = parseEvents(payload)

    const modelEvents = events.filter((event) => !isLoginEvent(event))
    const loginEvents = events.filter((event) => isLoginEvent(event))

    modelLogs.value = modelEvents.map(toModelLogItem)
    loginLogs.value = loginEvents.map(toLoginLogItem)
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : '日志加载失败，请稍后重试。'
    modelLogs.value = []
    loginLogs.value = []
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  void refreshLogs()
})

// ─── 计算属性：过滤后的日志 ──────────────────────────────────
const filteredModelLogs = computed(() => {
  if (!searchQuery.value) return modelLogs.value
  return modelLogs.value.filter(
    (log) =>
      log.user.includes(searchQuery.value) ||
      log.action.includes(searchQuery.value) ||
      log.target.includes(searchQuery.value)
  )
})

const filteredLoginLogs = computed(() => {
  if (!searchQuery.value) return loginLogs.value
  return loginLogs.value.filter(
    (log) =>
      log.user.includes(searchQuery.value) ||
      log.ip.includes(searchQuery.value) ||
      log.location.includes(searchQuery.value)
  )
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
</style>
