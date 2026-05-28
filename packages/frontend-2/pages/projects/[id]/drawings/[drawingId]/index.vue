<template>
  <div
    class="h-full flex flex-col overflow-hidden"
    :class="theme === 'dark' ? 'bg-[#0f111a]' : 'bg-white'"
  >
    <div
      class="h-14 border-b flex items-center justify-between shrink-0 px-4 shadow-sm"
      :class="
        theme === 'dark'
          ? 'border-gray-800 shadow-[0_12px_30px_-22px_rgba(0,0,0,0.85)]'
          : 'border-slate-200 shadow-[0_10px_26px_-22px_rgba(2,6,23,0.45)]'
      "
    >
      <button
        class="flex items-center space-x-1 px-3 py-1.5 rounded-[8px] text-sm font-medium transition-colors"
        :class="
          theme === 'dark'
            ? 'text-[#00b4b6] bg-[#0b2c2c] hover:bg-[#00b4b6] hover:text-white'
            : 'text-[#00b4b6] bg-[#e6f7f8] hover:bg-[#00b4b6] hover:text-white'
        "
        @click="goBack"
      >
        <ArrowLeftIcon class="w-4 h-4" />
        <span>返回</span>
      </button>
      <div class="flex items-center space-x-2 min-w-0">
        <span
          class="text-sm truncate"
          :class="theme === 'dark' ? 'text-gray-200' : 'text-slate-800'"
        >
          {{ drawing?.name || drawing?.fileName || '图纸' }}
        </span>
      </div>
      <button
        v-if="drawing"
        class="flex items-center space-x-1 px-3 py-1.5 rounded text-sm font-medium transition-colors"
        :class="
          theme === 'dark'
            ? 'bg-[#0b2c2c] text-[#00b4b6] hover:bg-[#00b4b6] hover:text-white'
            : 'bg-[#e6f7f8] text-[#00b4b6] hover:bg-[#00b4b6] hover:text-white'
        "
        @click="download"
      >
        <ArrowDownTrayIcon class="w-4 h-4" />
        <span>下载</span>
      </button>
      <span v-else class="w-[88px]" />
    </div>

    <div class="flex-1 min-h-0 overflow-hidden">
      <div
        v-if="loading"
        class="h-full flex items-center justify-center text-sm"
        :class="theme === 'dark' ? 'text-gray-300' : 'text-slate-600'"
      >
        加载中...
      </div>
      <div
        v-else-if="error"
        class="h-full flex items-center justify-center text-sm"
        :class="theme === 'dark' ? 'text-red-300' : 'text-red-600'"
      >
        {{ error }}
      </div>
      <ClientOnly v-else>
        <CommonCadViewer
          v-if="isDxf && drawing"
          :project-id="projectId"
          :drawing-id="drawingId"
          :blob-id="drawing.blobId"
          :file-name="drawing.fileName"
          class="h-full w-full"
        />
        <div
          v-else
          class="h-full flex flex-col items-center justify-center text-sm space-y-3"
          :class="theme === 'dark' ? 'text-gray-300' : 'text-slate-600'"
        >
          <div>暂不支持在线预览</div>
          <button
            v-if="drawing"
            class="flex items-center space-x-1 px-3 py-1.5 rounded text-sm font-medium transition-colors"
            :class="
              theme === 'dark'
                ? 'bg-[#0b2c2c] text-[#00b4b6] hover:bg-[#00b4b6] hover:text-white'
                : 'bg-[#e6f7f8] text-[#00b4b6] hover:bg-[#00b4b6] hover:text-white'
            "
            @click="download"
          >
            <ArrowDownTrayIcon class="w-4 h-4" />
            <span>下载</span>
          </button>
        </div>
      </ClientOnly>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ArrowDownTrayIcon, ArrowLeftIcon } from '@heroicons/vue/24/outline'
import CommonCadViewer from '~/components/common/CadViewer.vue'
import { useWorkbenchDrawingsApi } from '~/components/projects/workbench/drawingsApi'

definePageMeta({
  layout: 'viewer',
  pageTransition: false,
  layoutTransition: false
})

const route = useRoute()
const router = useRouter()
const api = useWorkbenchDrawingsApi()

const projectId = route.params.id as string
const drawingId = route.params.drawingId as string

const theme = ref<'dark' | 'light'>('light')
const syncThemeFromStorage = () => {
  if (!import.meta.client) return
  const saved = window.localStorage.getItem('cadViewerTheme')
  if (saved === 'dark' || saved === 'light') theme.value = saved
  else theme.value = 'light'
}

const loading = ref(true)
const error = ref<string | null>(null)
const drawing = ref<null | {
  id: string
  projectId: string
  name: string
  blobId: string
  fileName: string
  fileType: string
  fileSize: number | null
  creator: string
  updater: string
  createdAt: string
  updatedAt: string
}>(null)

const isDxf = computed(() => drawing.value?.fileType?.toLowerCase() === 'dxf')

const goBack = () => {
  router.back()
}

const download = async () => {
  if (!drawing.value) return
  const url = await api.getDownloadUrl(projectId, drawingId)
  window.open(url, '_blank')
}

onMounted(async () => {
  syncThemeFromStorage()
  const onThemeChanged = (e: Event) => {
    const v = (e as CustomEvent<'dark' | 'light'>).detail
    if (v === 'dark' || v === 'light') theme.value = v
  }
  if (import.meta.client) {
    window.addEventListener('cadViewerThemeChanged', onThemeChanged as EventListener)
    window.addEventListener('storage', syncThemeFromStorage)
    onBeforeUnmount(() => {
      window.removeEventListener(
        'cadViewerThemeChanged',
        onThemeChanged as EventListener
      )
      window.removeEventListener('storage', syncThemeFromStorage)
    })
  }

  loading.value = true
  error.value = null
  try {
    drawing.value = await api.getDrawing(projectId, drawingId)
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    loading.value = false
  }
})
</script>
