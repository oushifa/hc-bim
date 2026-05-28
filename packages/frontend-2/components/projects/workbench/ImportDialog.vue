<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-white/40 backdrop-blur-sm">
    <div class="bg-white/80 backdrop-blur-md rounded-[26px] shadow-2xl w-[800px] max-h-[80vh] flex flex-col overflow-hidden">
      <!-- Header -->
      <div class="p-4 border-b border-gray-100 flex justify-between items-center">
        <h3 class="text-lg font-medium text-[#333]">从模型库导入</h3>
        <button 
          @click="$emit('close')"
          class="text-gray-400 hover:text-gray-600"
        >
          关闭
        </button>
      </div>
      
      <!-- Search Bar -->
      <div class="p-4 border-b border-gray-100 bg-white/50 flex justify-between items-center">
        <span class="text-sm text-gray-600">
          导入到: <span class="font-medium text-[#00b4b6]">{{ activeDirName }}</span>
        </span>
        <div class="relative">
          <MagnifyingGlassIcon class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none z-10" />
          <input 
            v-model="searchQuery"
            type="text" 
            placeholder="搜索模型库..." 
            class="search-input w-64 bg-white border border-gray-200 rounded-md py-1.5 pl-9 pr-4 text-sm focus:outline-none focus:border-[#00b4b6] text-[#333]"
          />
        </div>
      </div>

      <!-- Model Grid -->
      <div class="flex-1 overflow-auto p-4">
        <div v-if="loading" class="py-16 text-center text-sm text-gray-500">
          模型库加载中...
        </div>
        <div v-else-if="filteredModels.length === 0" class="py-16 text-center text-sm text-gray-500">
          暂无可导入模型
        </div>
        <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div 
            v-for="model in filteredModels" 
            :key="model.id" 
            @click="toggleSelection(model.id)"
            :class="[
              'relative border rounded-lg p-3 cursor-pointer transition-all',
              isSelected(model.id)
                ? 'border-[#00b4b6] bg-[#e6f7f8] shadow-sm'
                : 'border-gray-200 hover:border-[#00b4b6] bg-white/80 backdrop-blur-md'
            ]"
          >
            <div class="flex items-start justify-between mb-2">
              <div class="flex items-center space-x-2">
                <CubeIcon :class="['h-4 w-4', isSelected(model.id) ? 'text-[#00b4b6]' : 'text-gray-400']" />
                <h4 class="text-sm font-medium text-[#333] line-clamp-1" :title="model.title">
                  {{ model.title }}
                </h4>
              </div>
              <div :class="isSelected(model.id) ? 'text-[#00b4b6]' : 'text-gray-300'">
                <CheckIcon v-if="isSelected(model.id)" class="h-5 w-5" />
                <Square2StackIcon v-else class="h-5 w-5" />
              </div>
            </div>
            <div class="mb-2 text-xs text-gray-500 truncate">
              {{ model.streamName || '未分配项目' }}
            </div>
            <div class="text-xs text-gray-500 flex justify-between items-center gap-2">
              <span class="truncate">{{ formatDate(model.updateTime) }}</span>
              <span>版本: {{ model.versions }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="p-4 border-t border-gray-100 flex justify-between items-center bg-white/50">
        <span class="text-sm text-gray-600">
          已选择 <span class="font-medium text-[#00b4b6]">{{ selectedCount }}</span> 个模型
        </span>
        <div class="space-x-3">
          <button 
            @click="$emit('close')"
            class="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            取消
          </button>
          <button 
            @click="$emit('import', selectedModels)"
            :disabled="selectedCount === 0 || importing"
            :class="[
              'px-4 py-2 text-sm font-medium text-white rounded-md transition-colors',
              selectedCount > 0 && !importing
                ? 'bg-[#00b4b6] hover:bg-[#009fa1]' 
                : 'bg-gray-300 cursor-not-allowed'
            ]"
          >
            {{ importing ? '导入中...' : '确认导入' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { MagnifyingGlassIcon, CubeIcon, CheckIcon, Square2StackIcon } from '@heroicons/vue/24/outline'
import dayjs from 'dayjs'
import type { ModelLibraryListItem } from '~/lib/projects/composables/modelLibrary'
import { useModelLibraryApi } from '~/lib/projects/composables/modelLibrary'

const props = defineProps<{
  activeDirName: string
  importing?: boolean
}>()

const emit = defineEmits<{
  close: []
  import: [models: ModelLibraryListItem[]]
}>()

const searchQuery = ref('')
const selectedModels = ref<ModelLibraryListItem[]>([])
const models = ref<ModelLibraryListItem[]>([])
const loading = ref(false)
const { listModels } = useModelLibraryApi()

const filteredModels = computed(() => models.value)

const isSelected = (id: string) => {
  return selectedModels.value.some((m) => m.id === id)
}

const toggleSelection = (id: string) => {
  const model = models.value.find((m) => m.id === id)
  if (!model) return
  
  const index = selectedModels.value.findIndex((m) => m.id === id)
  if (index > -1) {
    selectedModels.value.splice(index, 1)
  } else {
    selectedModels.value.push(model)
  }
}

const selectedCount = computed(() => selectedModels.value.length)

const formatDate = (value: string) => dayjs(value).format('YYYY-MM-DD HH:mm')

const loadModels = async () => {
  loading.value = true
  try {
    const result = await listModels({
      search: searchQuery.value.trim(),
      page: 1,
      pageSize: 30
    })
    models.value = result.data
  } finally {
    loading.value = false
  }
}

let searchTimeout: ReturnType<typeof setTimeout> | undefined
watch(searchQuery, () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    void loadModels()
  }, 300)
})

onMounted(() => {
  void loadModels()
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
