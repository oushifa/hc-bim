<template>
  <div class="h-full flex flex-col bg-gray-50 backdrop-blur-md rounded-[26px] shadow-sm overflow-hidden">
    <!-- Header & Toolbar -->
    <div class="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
      <div class="flex items-center space-x-2">
        <h2 class="text-xl font-bold text-[#333]">轻量模型</h2>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <!-- Search -->
        <div class="relative">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索模型..."
            class="w-48 border rounded-[8px] py-1.5 pl-3 pr-8 text-sm focus:outline-none focus:ring-0 text-[#333] transition-all"
            :class="searchQuery ? 'border-[#00b4b6] bg-white' : 'border-transparent bg-gray-50'"
          />
          <MagnifyingGlassIcon class="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        </div>

        <!-- 自定义下拉：所有成员 -->
        <div class="relative w-32" ref="memberSelectRef">
          <div
            class="w-full px-3 py-1.5 border rounded-[8px] text-sm flex items-center justify-between cursor-pointer transition-colors text-gray-600"
            :class="memberFilter !== 'all' ? 'border-[#00b4b6] bg-white' : 'border-transparent bg-gray-50'"
            @click="memberOpen = !memberOpen"
          >
            <span class="truncate">{{ memberOptions.find(o => o.value === memberFilter)?.label }}</span>
            <ChevronDownIcon :class="['w-4 h-4 text-gray-400 transition-transform', memberOpen ? 'rotate-180' : '']" />
          </div>
          <div v-if="memberOpen" class="absolute top-full left-0 mt-1 w-full bg-white border border-[#00b4b6] rounded-[8px] shadow-lg z-50 overflow-hidden py-1">
            <div
              v-for="opt in memberOptions"
              :key="opt.value"
              class="px-3 py-2 text-sm cursor-pointer transition-colors"
              :class="memberFilter === opt.value ? 'bg-[#00b4b6] text-white' : 'text-gray-600 hover:bg-[#e6f7f8] hover:text-[#00b4b6]'"
              @click="memberFilter = opt.value; memberOpen = false"
            >{{ opt.label }}</div>
          </div>
        </div>

        <!-- 自定义下拉：所有来源 -->
        <div class="relative w-32" ref="sourceSelectRef">
          <div
            class="w-full px-3 py-1.5 border rounded-[8px] text-sm flex items-center justify-between cursor-pointer transition-colors text-gray-600"
            :class="sourceFilter !== 'all' ? 'border-[#00b4b6] bg-white' : 'border-transparent bg-gray-50'"
            @click="sourceOpen = !sourceOpen"
          >
            <span class="truncate">{{ sourceOptions.find(o => o.value === sourceFilter)?.label }}</span>
            <ChevronDownIcon :class="['w-4 h-4 text-gray-400 transition-transform', sourceOpen ? 'rotate-180' : '']" />
          </div>
          <div v-if="sourceOpen" class="absolute top-full left-0 mt-1 w-full bg-white border border-[#00b4b6] rounded-[8px] shadow-lg z-50 overflow-hidden py-1">
            <div
              v-for="opt in sourceOptions"
              :key="opt.value"
              class="px-3 py-2 text-sm cursor-pointer transition-colors"
              :class="sourceFilter === opt.value ? 'bg-[#00b4b6] text-white' : 'text-gray-600 hover:bg-[#e6f7f8] hover:text-[#00b4b6]'"
              @click="sourceFilter = opt.value; sourceOpen = false"
            >{{ opt.label }}</div>
          </div>
        </div>

        <!-- Action Button -->
        <button class="bg-[#00b4b6] hover:bg-[#009fa1] text-white px-4 py-1.5 rounded-[8px] text-sm font-medium transition-colors">
          新建模型
        </button>
      </div>
    </div>

    <!-- Content Area -->
    <div class="flex-1 overflow-auto bg-[#f5f7fa] p-6">
      <div class="bg-white/80 backdrop-blur-md border border-gray-200 rounded-[8px] overflow-hidden">
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
                      v-if="model.hasModel"
                      src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=100&auto=format&fit=crop"
                      alt="thumbnail"
                      class="w-full h-full object-cover"
                    />
                    <CubeIcon v-else class="h-4 w-4 text-gray-400" />
                  </div>
                  <span class="font-medium whitespace-pre-line">{{ model.title }}</span>
                </div>
              </td>
              <td class="px-4 py-3 text-gray-500">{{ model.updateTime }}</td>
              <td class="px-4 py-3">
                <span v-if="model.status" class="text-red-500 text-xs">{{ model.status }}</span>
                <span v-else class="text-green-600 text-xs">正常</span>
              </td>
              <td class="px-4 py-3 text-center text-gray-500">{{ model.comments }}</td>
              <td class="px-4 py-3 text-center text-gray-500">{{ model.versions }}</td>
              <!-- 三点操作菜单 -->
              <td class="px-4 py-3 text-right relative">
                <button
                  class="text-gray-400 hover:text-gray-600 p-1"
                  @click.stop="toggleActionMenu(model.id)"
                >
                  <EllipsisHorizontalIcon class="h-4 w-4" />
                </button>
                <template v-if="activeActionMenu === model.id">
                  <div class="fixed inset-0 z-10" @click.stop="activeActionMenu = null" />
                  <div class="absolute right-8 top-10 w-40 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-20 overflow-hidden text-left">
                    <button
                      class="w-full flex items-center space-x-2 px-4 py-2 text-sm text-gray-600 hover:bg-[#f5f7fa] hover:text-[#00b4b6] transition-colors"
                      @click.stop="activeActionMenu = null"
                    >
                      <ArrowDownTrayIcon class="w-3.5 h-3.5" />
                      <span>导出模型数据</span>
                    </button>
                    <button
                      class="w-full flex items-center space-x-2 px-4 py-2 text-sm text-gray-600 hover:bg-[#f5f7fa] hover:text-[#00b4b6] transition-colors"
                      @click.stop="activeActionMenu = null"
                    >
                      <ShareIcon class="w-3.5 h-3.5" />
                      <span>分享</span>
                    </button>
                    <button
                      class="w-full flex items-center space-x-2 px-4 py-2 text-sm text-gray-600 hover:bg-[#f5f7fa] hover:text-[#00b4b6] transition-colors"
                      @click.stop="activeActionMenu = null"
                    >
                      <PencilIcon class="w-3.5 h-3.5" />
                      <span>重命名</span>
                    </button>
                    <button
                      class="w-full flex items-center space-x-2 px-4 py-2 text-sm text-gray-600 hover:bg-[#f5f7fa] hover:text-[#00b4b6] transition-colors"
                      @click.stop="activeActionMenu = null"
                    >
                      <ClockIcon class="w-3.5 h-3.5" />
                      <span>历史版本</span>
                    </button>
                    <button
                      class="w-full flex items-center space-x-2 px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
                      @click.stop="activeActionMenu = null"
                    >
                      <TrashIcon class="w-3.5 h-3.5" />
                      <span>删除</span>
                    </button>
                  </div>
                </template>
              </td>
            </tr>
            <tr v-if="filteredModels.length === 0">
              <td colspan="6" class="py-16 text-center text-gray-400 text-sm">
                暂无模型数据
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Model Detail Modal (Teleport to body for true fullscreen) -->
    <Teleport to="body">
      <ModelDetail
        v-if="selectedModel"
        :model="selectedModel"
        @close="selectedModel = null"
      />
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import {
  MagnifyingGlassIcon,
  CubeIcon,
  ChevronDownIcon,
  EllipsisHorizontalIcon,
  ArrowDownTrayIcon,
  ShareIcon,
  PencilIcon,
  ClockIcon,
  TrashIcon
} from '@heroicons/vue/24/outline'
import ModelDetail from './Detail.vue'

interface Model {
  id: number
  title: string
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
const activeActionMenu = ref<number | null>(null)

const memberSelectRef = ref<HTMLElement | null>(null)
const sourceSelectRef = ref<HTMLElement | null>(null)

const memberOptions = [
  { value: 'all', label: '所有成员' },
  { value: 'mine', label: '我的模型' }
]
const sourceOptions = [
  { value: 'all', label: '所有来源' },
  { value: 'local', label: '本地上传' },
  { value: 'plugin', label: '插件同步' }
]

const mockModels: Model[] = [
  { id: 1, title: '测试空间代码-编码示例模型22', updateTime: '19小时前 更新', comments: 0, versions: 2, hasModel: true },
  { id: 2, title: 'test/test1/\ntest2', updateTime: '1天前 更新', status: '上次上传失败', comments: 0, versions: 0, hasModel: false },
  { id: 3, title: '南北通道首开段地质bim模型', updateTime: '2天前 更新', comments: 1, versions: 1, hasModel: true },
  { id: 4, title: '建筑结构_首开段一区_围护结构_20260112——编...', updateTime: '6天前 更新', comments: 3, versions: 2, hasModel: true },
  { id: 5, title: '建筑结构_四平路工作井_围护结构_20260311', updateTime: '9天前 更新', comments: 1, versions: 1, hasModel: true },
  { id: 6, title: '建筑结构_6区_主体结构_20260212', updateTime: '12天前 更新', comments: 0, versions: 3, hasModel: true },
  { id: 7, title: '建筑结构_7区_主体结构_20260212', updateTime: '12天前 更新', comments: 0, versions: 1, hasModel: true },
  { id: 8, title: '建筑结构_4区_主体结构_20260212', updateTime: '12天前 更新', comments: 0, versions: 2, hasModel: true },
]

const filteredModels = computed(() => {
  if (!searchQuery.value) return mockModels
  return mockModels.filter((m) => m.title.includes(searchQuery.value))
})

const openModelDetail = (model: Model) => {
  selectedModel.value = model
}

const toggleActionMenu = (id: number) => {
  activeActionMenu.value = activeActionMenu.value === id ? null : id
}

// 点击外部关闭下拉
const handleClickOutside = (e: MouseEvent) => {
  if (memberSelectRef.value && !memberSelectRef.value.contains(e.target as Node)) {
    memberOpen.value = false
  }
  if (sourceSelectRef.value && !sourceSelectRef.value.contains(e.target as Node)) {
    sourceOpen.value = false
  }
}
onMounted(() => document.addEventListener('mousedown', handleClickOutside))
onUnmounted(() => document.removeEventListener('mousedown', handleClickOutside))
</script>
