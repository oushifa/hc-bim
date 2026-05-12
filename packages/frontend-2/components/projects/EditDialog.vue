<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-white/40 backdrop-blur-sm"
      @click="$emit('update:open', false)"
    >
      <div
        class="bg-white/80 backdrop-blur-md rounded-[26px] shadow-xl w-full max-w-md overflow-hidden border border-white/40"
        @click.stop
      >
        <div class="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-white/50">
          <h3 class="text-xl font-bold text-gray-800">编辑项目</h3>
          <button
            class="p-2 hover:bg-gray-100 rounded-full transition-colors"
            @click="$emit('update:open', false)"
          >
            <XMarkIcon class="w-5 h-5 text-gray-400" />
          </button>
        </div>
        <form class="p-8 space-y-6" @submit.prevent="handleSubmit">
          <div class="space-y-2">
            <label class="text-sm font-medium text-gray-600">项目名称</label>
            <input
              v-model="formData.name"
              type="text"
              class="focus-brand w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:outline-none transition-all text-gray-700"
              placeholder="输入项目名称"
            />
          </div>
          <div class="flex space-x-4 pt-4">
            <button
              type="button"
              class="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              @click="$emit('update:open', false)"
            >
              取消
            </button>
            <button
              type="submit"
              class="flex-1 py-3 bg-[#00b4b6] text-white rounded-xl font-medium hover:bg-[#009fa1] transition-colors shadow-lg shadow-[#00b4b6]/20"
            >
              保存修改
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { XMarkIcon } from '@heroicons/vue/24/outline'

const props = defineProps<{
  open: boolean
  project: {
    id: string
    name: string
  } | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  update: [data: any]
}>()

const formData = ref({
  name: ''
})

watch(() => props.project, (newProject) => {
  if (newProject) {
    formData.value.name = newProject.name
  }
}, { immediate: true })

const handleSubmit = () => {
  if (!props.project) return
  emit('update', {
    id: props.project.id,
    ...formData.value
  })
}
</script>

<style scoped>
/* 强制覆盖输入框聚焦时的边框颜色与背景色 */
.focus-brand:focus,
.focus-brand:focus-visible {
  border: 1px solid #00b4b6 !important;
  background-color: #ffffff !important;
  outline: none !important;
  box-shadow: none !important;
}
</style>
