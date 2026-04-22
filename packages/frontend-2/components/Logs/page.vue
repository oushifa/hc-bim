<template>
  <div class="h-full">
    <!-- Header -->
    <div class="pt-3 pb-3 flex items-center justify-between bg-gray-50">
      <!-- <ClipboardDocumentListIcon class="h-5 w-5 text-[#00b4b6]" /> -->
      <h2 class="text-heading pl-5">日志管理</h2>
      <button
        class="flex items-center space-x-1 bg-white/80 backdrop-blur-md border border-gray-200 text-gray-600 hover:text-[#00b4b6] hover:border-[#00b4b6] px-3 py-1.5 rounded-[8px] text-sm font-medium transition-colors mr-5"
      >
        <ArrowDownTrayIcon class="w-4 h-4" />
        <span>导出日志</span>
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
        <div class="flex space-x-1 bg-[#f5f7fa] p-1 rounded-[8px] border border-gray-200">
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
            <MagnifyingGlassIcon
              class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
            />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="搜索操作人/内容..."
              class="w-56 bg-[#f5f7fa] border border-transparent rounded-[8px] py-1.5 pl-9 pr-4 text-sm focus:outline-none focus:border-[#00b4b6] focus:bg-white text-[#333] transition-all"
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
                  <span class="px-2.5 py-1 rounded-[6px] bg-gray-100 text-xs">{{
                    log.version
                  }}</span>
                </td>
                <td class="py-3.5 pr-6 text-gray-400">{{ log.ip }}</td>
              </tr>
              <tr v-if="filteredModelLogs.length === 0">
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
              <tr v-if="filteredLoginLogs.length === 0">
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
  ClipboardDocumentListIcon,
  ArrowDownTrayIcon
} from '@heroicons/vue/24/outline'

// ─── Tab 状态 ────────────────────────────────────────────────
const activeTab = ref<'model' | 'login'>('model')
const searchQuery = ref('')

// ─── 模型操作日志数据 ────────────────────────────────────────
const modelLogs = [
  {
    id: 1,
    time: '2023-12-31 10:05:22',
    user: '李明',
    action: '上传模型',
    target: 'T1塔楼建筑模型_v2.rvt',
    version: 'V2.0',
    ip: '192.168.1.105'
  },
  {
    id: 2,
    time: '2023-12-30 16:20:11',
    user: '王建国',
    action: '二三维联动配置',
    target: '地下室结构模型.ifc',
    version: 'V1.5',
    ip: '192.168.1.112'
  },
  {
    id: 3,
    time: '2023-12-29 14:15:00',
    user: '张伟',
    action: '下载模型',
    target: '暖通空调综合排布.nwd',
    version: 'V1.0',
    ip: '192.168.1.88'
  },
  {
    id: 4,
    time: '2023-12-28 09:30:45',
    user: '李明',
    action: '归档模型',
    target: '园区景观绿化.skp',
    version: 'V3.1',
    ip: '192.168.1.105'
  }
]

// ─── 用户登录日志数据 ────────────────────────────────────────
const loginLogs = [
  {
    id: 1,
    time: '2023-12-31 09:00:12',
    user: '李明',
    ip: '192.168.1.105',
    location: '上海市',
    status: '成功'
  },
  {
    id: 2,
    time: '2023-12-31 08:45:33',
    user: '王建国',
    ip: '192.168.1.112',
    location: '北京市',
    status: '成功'
  },
  {
    id: 3,
    time: '2023-12-30 22:10:05',
    user: '未知用户',
    ip: '114.254.1.22',
    location: '未知',
    status: '失败 (密码错误)'
  },
  {
    id: 4,
    time: '2023-12-30 08:55:20',
    user: '张伟',
    ip: '192.168.1.88',
    location: '广州市',
    status: '成功'
  }
]

// ─── 计算属性：过滤后的日志 ──────────────────────────────────
const filteredModelLogs = computed(() => {
  if (!searchQuery.value) return modelLogs
  return modelLogs.filter(
    (log) =>
      log.user.includes(searchQuery.value) ||
      log.action.includes(searchQuery.value) ||
      log.target.includes(searchQuery.value)
  )
})

const filteredLoginLogs = computed(() => {
  if (!searchQuery.value) return loginLogs
  return loginLogs.filter(
    (log) =>
      log.user.includes(searchQuery.value) ||
      log.ip.includes(searchQuery.value) ||
      log.location.includes(searchQuery.value)
  )
})
</script>
