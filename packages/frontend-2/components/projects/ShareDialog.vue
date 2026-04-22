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
          <h3 class="text-xl font-bold text-gray-800">分享项目</h3>
          <button
            class="p-2 hover:bg-gray-100 rounded-full transition-colors"
            @click="$emit('update:open', false)"
          >
            <XMarkIcon class="w-5 h-5 text-gray-400" />
          </button>
        </div>
        <div class="p-8 space-y-6">
          <!-- 有效期限设置 -->
          <div class="space-y-3">
            <label class="text-sm font-medium text-gray-600 flex items-center">
              <CalendarIcon class="w-4 h-4 mr-2 text-[#00b4b6]" />
              设置有效期限
            </label>
            <div class="grid grid-cols-3 gap-3">
              <button
                v-for="opt in expiryOptions"
                :key="opt.value"
                @click="selectedExpiry = opt.value"
                :class="[
                  'py-2 px-4 rounded-xl text-sm font-medium transition-all',
                  selectedExpiry === opt.value
                    ? 'bg-[#00b4b6] text-white shadow-md'
                    : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                ]"
              >
                {{ opt.label }}
              </button>
            </div>
          </div>

          <!-- 分享链接 -->
          <div class="space-y-3">
            <label class="text-sm font-medium text-gray-600 flex items-center">
              <LinkIcon class="w-4 h-4 mr-2 text-[#00b4b6]" />
              分享链接
            </label>
            <div class="flex space-x-2">
              <input
                type="text"
                readonly
                :value="shareUrl"
                class="flex-1 px-4 py-3 bg-gray-50 border border-transparent rounded-xl text-sm text-gray-500 focus:outline-none"
              />
              <button
                @click="copyLink"
                class="px-6 py-3 bg-[#00b4b6] text-white rounded-xl font-medium hover:bg-[#009fa1] transition-colors shadow-md"
              >
                复制
              </button>
            </div>
          </div>

          <!-- 完成按钮 -->
          <div class="pt-4">
            <button
              @click="$emit('update:open', false)"
              class="w-full py-3 bg-gray-100 text-gray-600 rounded-xl font-medium hover:bg-gray-200 transition-colors"
            >
              完成
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { XMarkIcon, CalendarIcon, LinkIcon } from '@heroicons/vue/24/outline'

const props = defineProps<{
  open: boolean
  project: {
    id: string
    name: string
  } | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const selectedExpiry = ref('7')

const expiryOptions = [
  { label: '7天', value: '7' },
  { label: '30天', value: '30' },
  { label: '永久', value: '0' }
]

const shareUrl = computed(() => {
  if (!props.project) return ''
  const baseUrl = window.location.origin
  return `${baseUrl}/projects/${props.project.id}?exp=${selectedExpiry.value}`
})

const copyLink = () => {
  navigator.clipboard.writeText(shareUrl.value).then(() => {
    // 可以添加toast提示
    console.log('链接已复制')
  })
}

watch(() => props.open, (newVal) => {
  if (newVal) {
    selectedExpiry.value = '7' // 重置为默认值
  }
})
</script>
