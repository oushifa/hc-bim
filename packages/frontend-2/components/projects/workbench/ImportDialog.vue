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
          <MagnifyingGlassIcon class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input 
            v-model="searchQuery"
            type="text" 
            placeholder="搜索模型库..." 
            class="w-64 bg-white/80 backdrop-blur-md border border-gray-200 rounded-md py-1.5 pl-9 pr-4 text-sm focus:outline-none focus:border-[#00b4b6] text-[#333]"
          />
        </div>
      </div>

      <!-- Model Grid -->
      <div class="flex-1 overflow-auto p-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div 
            v-for="model in filteredModels" 
            :key="model.id" 
            @click="!isAlreadyImported(model.id) && toggleSelection(model.id)"
            :class="[
              'relative border rounded-lg p-3 cursor-pointer transition-all',
              isAlreadyImported(model.id) 
                ? 'opacity-60 bg-gray-50 border-gray-200 cursor-not-allowed'
                : isSelected(model.id)
                  ? 'border-[#00b4b6] bg-[#e6f7f8] shadow-sm'
                  : 'border-gray-200 hover:border-[#00b4b6] bg-white/80 backdrop-blur-md'
            ]"
          >
            <div class="flex items-start justify-between mb-2">
              <div class="flex items-center space-x-2">
                <CubeIcon :class="['h-4 w-4', isSelected(model.id) ? 'text-[#00b4b6]' : 'text-gray-400']" />
                <h4 class="text-sm font-medium text-[#333] line-clamp-1" :title="model.name">
                  {{ model.name }}
                </h4>
              </div>
              <div v-if="!isAlreadyImported(model.id)" :class="isSelected(model.id) ? 'text-[#00b4b6]' : 'text-gray-300'">
                <CheckIcon v-if="isSelected(model.id)" class="h-5 w-5" />
                <Square2StackIcon v-else class="h-5 w-5" />
              </div>
              <span v-if="isAlreadyImported(model.id)" class="text-xs text-gray-500 bg-gray-200 px-1.5 py-0.5 rounded">
                已导入
              </span>
            </div>
            <div class="text-xs text-gray-500 flex justify-between items-center">
              <span>{{ model.updatedAt }}</span>
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
            :disabled="selectedCount === 0"
            :class="[
              'px-4 py-2 text-sm font-medium text-white rounded-md transition-colors',
              selectedCount > 0 
                ? 'bg-[#00b4b6] hover:bg-[#009fa1]' 
                : 'bg-gray-300 cursor-not-allowed'
            ]"
          >
            确认导入
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { MagnifyingGlassIcon, CubeIcon, CheckIcon, Square2StackIcon } from '@heroicons/vue/24/outline'

const props = defineProps<{
  activeDirName: string
  importedModelIds: string[]
}>()

const emit = defineEmits<{
  close: []
  import: [models: any[]]
}>()

const searchQuery = ref('')
const selectedModels = ref<any[]>([])

// Mock model library data
const mockLibraryModels = [
  { id: 'lib-1', name: '建筑主体模型', updatedAt: '2024-01-15', versions: 5 },
  { id: 'lib-2', name: '结构框架模型', updatedAt: '2024-01-14', versions: 3 },
  { id: 'lib-3', name: '机电管线模型', updatedAt: '2024-01-13', versions: 2 },
  { id: 'lib-4', name: '室内装修模型', updatedAt: '2024-01-12', versions: 4 },
  { id: 'lib-5', name: '景观绿化模型', updatedAt: '2024-01-11', versions: 1 },
  { id: 'lib-6', name: '消防系统模型', updatedAt: '2024-01-10', versions: 2 },
]

const filteredModels = computed(() => {
  if (!searchQuery.value) return mockLibraryModels
  const query = searchQuery.value.toLowerCase()
  return mockLibraryModels.filter(m => m.name.toLowerCase().includes(query))
})

const isSelected = (id: string) => {
  return selectedModels.value.some(m => m.id === id)
}

const isAlreadyImported = (id: string) => {
  return props.importedModelIds.includes(id)
}

const toggleSelection = (id: string) => {
  const model = mockLibraryModels.find(m => m.id === id)
  if (!model) return
  
  const index = selectedModels.value.findIndex(m => m.id === id)
  if (index > -1) {
    selectedModels.value.splice(index, 1)
  } else {
    selectedModels.value.push(model)
  }
}

const selectedCount = computed(() => selectedModels.value.length)
</script>
