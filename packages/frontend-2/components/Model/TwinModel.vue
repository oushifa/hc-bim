<template>
  <div class="h-full flex flex-col bg-[#E7EBEB] overflow-hidden">
    <!-- Top Filters -->
    <div class="bg-white/80 backdrop-blur-md p-4 rounded-[26px] shadow-sm mb-3 shrink-0 flex flex-col space-y-4 relative z-20">
      <!-- Tabs -->
      <div class="flex items-center space-x-1 border-b border-gray-100 pb-2">
        <button
          class="px-4 py-2 text-sm font-medium transition-colors relative"
          :class="activeTab === 'user' ? 'text-[#00b4b6]' : 'text-gray-500 hover:text-gray-700'"
          @click="switchTab('user')"
        >
          用户模型
          <div v-if="activeTab === 'user'" class="absolute bottom-[-9px] left-0 w-full h-0.5 bg-[#00b4b6] rounded-t-full" />
        </button>
        <button
          class="px-4 py-2 text-sm font-medium transition-colors relative"
          :class="activeTab === 'official' ? 'text-[#00b4b6]' : 'text-gray-500 hover:text-gray-700'"
          @click="switchTab('official')"
        >
          官方模型
          <div v-if="activeTab === 'official'" class="absolute bottom-[-9px] left-0 w-full h-0.5 bg-[#00b4b6] rounded-t-full" />
        </button>
      </div>

      <!-- Filter Controls -->
      <div class="flex flex-wrap items-center gap-6">
        <!-- 公共：模型名称/ID -->
        <div class="flex items-center space-x-2">
          <span class="text-sm text-gray-600 whitespace-nowrap">模型名称/ID：</span>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="请输入模型名称/ID"
            class="w-48 px-3 py-1.5 border rounded-[8px] text-sm focus:outline-none focus:ring-0 transition-colors"
            :class="searchQuery ? 'border-[#00b4b6] bg-white' : 'border-transparent bg-gray-50'"
          />
        </div>

        <!-- 用户模型筛选项 -->
        <template v-if="activeTab === 'user'">
          <div class="flex items-center space-x-2">
            <span class="text-sm text-gray-600 whitespace-nowrap">状态：</span>
            <select
              v-model="statusFilter"
              class="w-32 px-3 py-1.5 border rounded-[8px] text-sm text-gray-600 focus:outline-none focus:border-[#00b4b6] cursor-pointer transition-colors"
              :class="statusFilter ? 'border-[#00b4b6] bg-white' : 'border-transparent bg-gray-50'"
            >
              <option value="">请选择</option>
              <option value="1">已上架</option>
              <option value="2">已下架</option>
            </select>
          </div>
          <div class="flex items-center space-x-2">
            <span class="text-sm text-gray-600 whitespace-nowrap">构件数据：</span>
            <select
              v-model="componentDataFilter"
              class="w-32 px-3 py-1.5 border rounded-[8px] text-sm text-gray-600 focus:outline-none focus:border-[#00b4b6] cursor-pointer transition-colors"
              :class="componentDataFilter ? 'border-[#00b4b6] bg-white' : 'border-transparent bg-gray-50'"
            >
              <option value="">请选择</option>
              <option value="1">有</option>
              <option value="0">无</option>
            </select>
          </div>
        </template>

        <!-- 官方模型筛选项 -->
        <template v-else>
          <div class="flex items-center space-x-2">
            <span class="text-sm text-gray-600 whitespace-nowrap">上架状态：</span>
            <select
              v-model="publishStatusFilter"
              class="w-32 px-3 py-1.5 border rounded-[8px] text-sm text-gray-600 focus:outline-none focus:border-[#00b4b6] cursor-pointer transition-colors"
              :class="publishStatusFilter ? 'border-[#00b4b6] bg-white' : 'border-transparent bg-gray-50'"
            >
              <option value="">请选择状态</option>
              <option value="1">已上架</option>
              <option value="2">已下架</option>
            </select>
          </div>
          <div class="flex items-center space-x-2">
            <span class="text-sm text-gray-600 whitespace-nowrap">分类：</span>
            <select
              v-model="categoryFilter"
              class="w-32 px-3 py-1.5 border rounded-[8px] text-sm text-gray-600 focus:outline-none focus:border-[#00b4b6] cursor-pointer transition-colors"
              :class="categoryFilter ? 'border-[#00b4b6] bg-white' : 'border-transparent bg-gray-50'"
            >
              <option value="">请选择</option>
              <option value="plant">植物/乔木</option>
              <option value="character">角色/人类</option>
            </select>
          </div>
        </template>

        <div class="flex-1 flex justify-end">
          <button
            v-if="activeTab === 'user'"
            :disabled="selectedIds.size === 0"
            class="px-4 py-1.5 border border-gray-200 rounded-[8px] text-sm text-gray-600 hover:text-[#00b4b6] hover:border-[#00b4b6] transition-colors bg-white/80 backdrop-blur-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            批量下架
          </button>
        </div>
      </div>
    </div>

    <!-- Main Table Area -->
    <div class="flex-1 bg-white/80 backdrop-blur-md rounded-[26px] shadow-sm flex flex-col overflow-hidden">
      <div class="flex-1 overflow-auto">
        <table class="w-full text-left border-collapse min-w-[1000px]">
          <thead class="bg-[#f8f9fa] sticky top-0 z-10">
            <tr class="border-b border-gray-100 text-sm text-gray-600 font-medium">
              <!-- 仅用户模型显示全选框 -->
              <th v-if="activeTab === 'user'" class="py-3 px-4 w-12 text-center">
                <div
                  class="w-4 h-4 border-2 rounded-sm cursor-pointer flex items-center justify-center mx-auto transition-colors"
                  :class="isAllSelected ? 'bg-[#00b4b6] border-[#00b4b6]' : isIndeterminate ? 'bg-[#00b4b6] border-[#00b4b6]' : 'border-gray-300 hover:border-[#00b4b6]'"
                  @click="toggleSelectAll"
                >
                  <svg v-if="isAllSelected" class="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12" stroke="currentColor" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M2 6l3 3 5-5" />
                  </svg>
                  <svg v-else-if="isIndeterminate" class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 12 12">
                    <rect x="2" y="5" width="8" height="2" rx="1" />
                  </svg>
                </div>
              </th>
              <th class="py-3 px-4">模型名称/ID</th>
              <th v-if="activeTab === 'official'" class="py-3 px-4">分类</th>
              <th class="py-3 px-4">系统</th>
              <th v-if="activeTab === 'official'" class="py-3 px-4">数据版本</th>
              <th v-if="activeTab === 'user'" class="py-3 px-4">原始格式</th>
              <th class="py-3 px-4">资产大小</th>
              <th v-if="activeTab === 'user'" class="py-3 px-4">构件数据</th>
              <th class="py-3 px-4">{{ activeTab === 'user' ? '生成时间' : '上架时间' }}</th>
              <th class="py-3 px-4">{{ activeTab === 'user' ? '状态' : '上架状态' }}</th>
              <th v-if="activeTab === 'official'" class="py-3 px-4">行业标签</th>
              <th class="py-3 px-4">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="model in filteredModels"
              :key="model.id"
              class="border-b border-gray-50 hover:bg-gray-50 transition-colors"
            >
              <!-- 仅用户模型显示行勾选框 -->
              <td v-if="activeTab === 'user'" class="py-4 px-4 text-center">
                <div
                  class="w-4 h-4 border-2 rounded-sm cursor-pointer flex items-center justify-center mx-auto transition-colors"
                  :class="selectedIds.has(model.id) ? 'bg-[#00b4b6] border-[#00b4b6]' : 'border-gray-300 hover:border-[#00b4b6]'"
                  @click="toggleSelect(model.id)"
                >
                  <svg v-if="selectedIds.has(model.id)" class="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12" stroke="currentColor" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M2 6l3 3 5-5" />
                  </svg>
                </div>
              </td>
              <td class="py-4 px-4">
                <div class="flex items-center space-x-3">
                  <div class="w-10 h-10 rounded-[8px] bg-gray-100 overflow-hidden shrink-0">
                    <CubeIcon class="w-full h-full p-2 text-gray-400" />
                  </div>
                  <div class="flex flex-col">
                    <span class="text-sm font-medium text-[#333]">{{ model.name }}</span>
                    <span class="text-xs text-gray-400">SeedID:{{ model.seedId }}</span>
                  </div>
                </div>
              </td>
              <td v-if="activeTab === 'official'" class="py-4 px-4 text-sm text-gray-600">{{ (model as OfficialModel).category }}</td>
              <td class="py-4 px-4 text-sm text-gray-600">{{ model.system }}</td>
              <td v-if="activeTab === 'official'" class="py-4 px-4 text-sm text-gray-600">{{ (model as OfficialModel).dataVersion }}</td>
              <td v-if="activeTab === 'user'" class="py-4 px-4 text-sm text-gray-600">{{ (model as UserModel).originalFormat }}</td>
              <td class="py-4 px-4 text-sm text-gray-600">{{ model.assetSize }}</td>
              <td v-if="activeTab === 'user'" class="py-4 px-4 text-sm text-gray-600">{{ (model as UserModel).componentData }}</td>
              <td class="py-4 px-4 text-sm text-gray-600">
                {{ activeTab === 'user' ? (model as UserModel).generationTime : (model as OfficialModel).publishTime }}
              </td>
              <td class="py-4 px-4 text-sm text-gray-600">{{ model.status }}</td>
              <td v-if="activeTab === 'official'" class="py-4 px-4 text-sm text-gray-600">{{ (model as OfficialModel).industryTag }}</td>
              <td class="py-4 px-4 text-sm space-x-3">
                <template v-if="activeTab === 'user'">
                  <button class="text-[#00b4b6] hover:underline">下架</button>
                  <button class="text-[#00b4b6] hover:underline">编辑</button>
                </template>
                <template v-else>
                  <button class="text-[#00b4b6] hover:underline">版本管理</button>
                  <button class="text-[#00b4b6] hover:underline">编辑</button>
                </template>
              </td>
            </tr>
            <tr v-if="filteredModels.length === 0">
              <td :colspan="activeTab === 'user' ? 9 : 9" class="py-16 text-center text-gray-400 text-sm">
                暂无孪生模型数据
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div class="h-14 border-t border-gray-100 flex items-center justify-end px-6 shrink-0 bg-white/80 backdrop-blur-md">
        <div class="flex items-center space-x-4 text-sm text-gray-500">
          <span>共 {{ activeTab === 'user' ? '11373' : '2308' }} 条记录 / 第 1 - 20 条</span>
          <div class="flex items-center space-x-1">
            <button class="p-1 border border-gray-200 rounded-[8px] text-gray-400 hover:text-[#00b4b6] hover:border-[#00b4b6] disabled:opacity-50">
              <ChevronLeftIcon class="w-4 h-4" />
            </button>
            <button class="w-8 h-8 flex items-center justify-center border border-[#00b4b6] text-[#00b4b6] rounded bg-[#e6f7f8]">1</button>
            <button class="w-8 h-8 flex items-center justify-center border border-gray-200 text-gray-600 rounded hover:border-[#00b4b6] hover:text-[#00b4b6]">2</button>
            <button class="w-8 h-8 flex items-center justify-center border border-gray-200 text-gray-600 rounded hover:border-[#00b4b6] hover:text-[#00b4b6]">3</button>
            <button class="w-8 h-8 flex items-center justify-center border border-gray-200 text-gray-600 rounded hover:border-[#00b4b6] hover:text-[#00b4b6]">4</button>
            <button class="w-8 h-8 flex items-center justify-center border border-gray-200 text-gray-600 rounded hover:border-[#00b4b6] hover:text-[#00b4b6]">5</button>
            <span class="px-1"><EllipsisHorizontalIcon class="w-4 h-4 text-gray-400" /></span>
            <button class="w-8 h-8 flex items-center justify-center border border-gray-200 text-gray-600 rounded hover:border-[#00b4b6] hover:text-[#00b4b6]">
              {{ activeTab === 'user' ? '569' : '116' }}
            </button>
            <button class="p-1 border border-gray-200 rounded text-gray-600 hover:text-[#00b4b6] hover:border-[#00b4b6]">
              <ChevronRightIcon class="w-4 h-4" />
            </button>
          </div>
          <select class="border border-[#00b4b6] rounded-[8px] px-2 py-1 text-sm focus:outline-none focus:border-[#00b4b6] cursor-pointer">
            <option>20 / page</option>
            <option>50 / page</option>
            <option>100 / page</option>
          </select>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CubeIcon, ChevronLeftIcon, ChevronRightIcon, EllipsisHorizontalIcon } from '@heroicons/vue/24/outline'

interface UserModel {
  id: string
  name: string
  seedId: string
  system: string
  productType: string
  originalFormat: string
  assetSize: string
  componentData: string
  generationTime: string
  status: string
}

interface OfficialModel {
  id: string
  name: string
  seedId: string
  category: string
  system: string
  dataVersion: string
  assetSize: string
  publishTime: string
  status: string
  industryTag: string
}

const activeTab = ref<'user' | 'official'>('user')
const searchQuery = ref('')
// 用户模型筛选
const statusFilter = ref('')
const componentDataFilter = ref('')
// 官方模型筛选
const publishStatusFilter = ref('')
const categoryFilter = ref('')

const mockUserModels: UserModel[] = [
  { id: '1', name: 'TK.fbx', seedId: '07a607a9ac5941bdc867f02e67312c85', system: 'win', productType: 'WDP消费(UE5.5)', originalFormat: 'fbx', assetSize: '0.19 M', componentData: '有', generationTime: '2026-04-02 10:03:45', status: '已上架' },
  { id: '2', name: 'dx.fbx', seedId: '6468b35404b46a51fb234e0f132380d5', system: 'win', productType: 'WDP消费(UE5.5)', originalFormat: 'fbx', assetSize: '8.90 M', componentData: '有', generationTime: '2026-04-02 09:28:06', status: '已上架' },
  { id: '3', name: '202603301.fbx', seedId: '6aaba3f6ec1733db0a764eb6b72016cf', system: 'win', productType: 'WDP消费(UE5.5)', originalFormat: 'fbx', assetSize: '65.03 M', componentData: '有', generationTime: '2026-04-02 09:11:15', status: '已上架' },
  { id: '4', name: 'point.glb', seedId: '4d85c76bfafad63f942bf504dba0f195', system: 'win', productType: 'WDP消费(UE5.5)', originalFormat: 'glb', assetSize: '0.02 M', componentData: '有', generationTime: '2026-04-01 12:03:15', status: '已上架' },
  { id: '5', name: 'fix_terrain_0325.fbx', seedId: '61e27dcb3fbda1dd29d19bc39a70e6bb', system: 'win', productType: 'WDP消费(UE5.5)', originalFormat: 'fbx', assetSize: '62.18 M', componentData: '有', generationTime: '2026-03-31 17:35:15', status: '已上架' },
  { id: '6', name: '主厂房外形.fbx', seedId: '3d3f1e93420d1498d7480c14cadc0e93', system: 'win', productType: 'WDP消费(UE5.5)', originalFormat: 'fbx', assetSize: '0.90 M', componentData: '有', generationTime: '2026-03-31 16:06:45', status: '已上架' },
  { id: '7', name: '房屋7.zip', seedId: 'cdc0398da185024f41cae08b6171554d', system: 'win', productType: 'WDP消费(UE5.5)', originalFormat: 'obj', assetSize: '0.19 M', componentData: '有', generationTime: '2026-03-31 15:29:10', status: '已上架' },
]

const mockOfficialModels: OfficialModel[] = [
  { id: 'o1', name: '黄葛树01', seedId: '654a4da916557ef217401cf6b901ec29', category: '["植物/乔木"]', system: 'win', dataVersion: '0.0.2', assetSize: '31.89 M', publishTime: '2026-04-01 18:29:41', status: '已上架', industryTag: '["静态模型"]' },
  { id: 'o2', name: '丛生金桂01', seedId: '6eb3fd77bea25e1a1c75743a6bde3fd2', category: '["植物/乔木"]', system: 'win', dataVersion: '0.0.2', assetSize: '29.33 M', publishTime: '2026-04-01 18:29:41', status: '已上架', industryTag: '["静态模型"]' },
  { id: 'o3', name: '丛生金桂02', seedId: '32cb367bc2cb41622baecb49ac37563e', category: '["植物/乔木"]', system: 'win', dataVersion: '0.0.2', assetSize: '26.17 M', publishTime: '2026-04-01 18:29:27', status: '已上架', industryTag: '["静态模型"]' },
  { id: 'o4', name: '安保人员02', seedId: 'dcf3ee20d1797e819bb518280c23fdd5', category: '["角色/人类"]', system: 'win', dataVersion: '0.0.1', assetSize: '10.71 M', publishTime: '2026-03-30 11:20:46', status: '已上架', industryTag: '["静态模型"]' },
  { id: 'o5', name: '安保人员01', seedId: '07a7f60f1fb47b8d418268fe1a3f352f', category: '["角色/人类"]', system: 'win', dataVersion: '0.0.1', assetSize: '26.09 M', publishTime: '2026-03-30 11:20:46', status: '已上架', industryTag: '["静态模型"]' },
  { id: 'o6', name: '安保人员03', seedId: '8acdf407b2b098eed741095c0379393d', category: '["角色/人类"]', system: 'win', dataVersion: '0.0.1', assetSize: '26.24 M', publishTime: '2026-03-30 11:20:46', status: '已上架', industryTag: '["静态模型"]' },
]

const currentData = computed(() => activeTab.value === 'user' ? mockUserModels : mockOfficialModels)

const filteredModels = computed(() => {
  let result = currentData.value as (UserModel | OfficialModel)[]
  if (searchQuery.value) {
    const q = searchQuery.value
    result = result.filter((m) => m.name.includes(q) || m.seedId.includes(q))
  }
  return result
})

// 勾选状态（仅用户模型）
const selectedIds = ref<Set<string>>(new Set())

const isAllSelected = computed(
  () => filteredModels.value.length > 0 && filteredModels.value.every((m) => selectedIds.value.has(m.id))
)
const isIndeterminate = computed(
  () => filteredModels.value.some((m) => selectedIds.value.has(m.id)) && !isAllSelected.value
)

const toggleSelect = (id: string) => {
  const next = new Set(selectedIds.value)
  next.has(id) ? next.delete(id) : next.add(id)
  selectedIds.value = next
}

const toggleSelectAll = () => {
  if (isAllSelected.value) {
    selectedIds.value = new Set()
  } else {
    selectedIds.value = new Set(filteredModels.value.map((m) => m.id))
  }
}

// 切换 tab 时清空选中和筛选条件
const switchTab = (tab: 'user' | 'official') => {
  activeTab.value = tab
  selectedIds.value = new Set()
  searchQuery.value = ''
  statusFilter.value = ''
  componentDataFilter.value = ''
  publishStatusFilter.value = ''
  categoryFilter.value = ''
}
</script>
