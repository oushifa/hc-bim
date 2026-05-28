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
          v-if="canRenderAsDxf && drawing"
          :project-id="projectId"
          :drawing-id="drawingId"
          :blob-id="renderBlobId"
          :file-name="renderFileName"
          class="h-full w-full"
        />
        <div
          v-else
          class="h-full flex flex-col items-center justify-center text-sm space-y-3"
          :class="theme === 'dark' ? 'text-gray-300' : 'text-slate-600'"
        >
          <template v-if="isDwg">
            <div v-if="conversionState === 'failed'" class="text-center space-y-2">
              <div>DWG 转 DXF 失败</div>
              <div class="text-xs opacity-80 max-w-[520px] break-words">
                {{ drawing?.conversionError || '未知错误' }}
              </div>
              <button
                v-if="drawing"
                class="flex items-center space-x-1 px-3 py-1.5 rounded text-sm font-medium transition-colors"
                :class="
                  theme === 'dark'
                    ? 'bg-[#0b2c2c] text-[#00b4b6] hover:bg-[#00b4b6] hover:text-white'
                    : 'bg-[#e6f7f8] text-[#00b4b6] hover:bg-[#00b4b6] hover:text-white'
                "
                @click="retryConvert"
              >
                <span>重试转换</span>
              </button>
            </div>
            <div v-else class="w-full max-w-[420px] space-y-2">
              <div class="text-center">DWG 转 DXF 中...</div>
              <div class="h-2 w-full rounded bg-gray-200 overflow-hidden">
                <div class="h-full w-1/2 bg-[#00b4b6] animate-pulse" />
              </div>
            </div>
          </template>
          <div v-else>暂不支持在线预览</div>
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
import { useAuthCookie } from '~/lib/auth/composables/auth'

definePageMeta({
  layout: 'viewer',
  pageTransition: false,
  layoutTransition: false
})

const route = useRoute()
const router = useRouter()
const api = useWorkbenchDrawingsApi()
const authCookie = useAuthCookie()
const apiOrigin = useApiOrigin()

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
  convertedBlobId: string | null
  conversionStatus: string | null
  conversionError: string | null
  fileName: string
  fileType: string
  fileSize: number | null
  creator: string
  updater: string
  createdAt: string
  updatedAt: string
}>(null)

const isDwg = computed(() => drawing.value?.fileType?.toLowerCase() === 'dwg')
const canRenderAsDxf = computed(() => {
  if (!drawing.value) return false
  if (drawing.value.fileType?.toLowerCase() === 'dxf') return true
  if (drawing.value.fileType?.toLowerCase() === 'dwg')
    return drawing.value.conversionStatus === 'done' && !!drawing.value.convertedBlobId
  return false
})

const conversionState = computed(() => {
  if (!isDwg.value) return null
  return drawing.value?.conversionStatus || 'pending'
})

const renderBlobId = computed(() => {
  if (!drawing.value) return ''
  if (drawing.value.fileType?.toLowerCase() === 'dxf') return drawing.value.blobId
  if (drawing.value.fileType?.toLowerCase() === 'dwg') return drawing.value.convertedBlobId || ''
  return drawing.value.blobId
})

const renderFileName = computed(() => {
  if (!drawing.value) return ''
  if (drawing.value.fileType?.toLowerCase() === 'dwg')
    return drawing.value.fileName.replace(/\.dwg$/i, '.dxf')
  return drawing.value.fileName
})

const goBack = () => {
  router.back()
}

const download = async () => {
  if (!drawing.value) return
  const url = await api.getDownloadUrl(projectId, drawingId)
  window.open(url, '_blank')
}

const conversionAbort = ref<AbortController | null>(null)

const stopConversionSubscription = () => {
  conversionAbort.value?.abort()
  conversionAbort.value = null
}

const startConversionSubscriptionIfNeeded = async () => {
  stopConversionSubscription()
  if (!drawing.value) return
  if (!isDwg.value) return
  if (drawing.value.conversionStatus === 'done' && drawing.value.convertedBlobId) return

  if (!drawing.value.conversionStatus || drawing.value.conversionStatus === 'pending') {
    await api.convertToDxf(projectId, drawingId)
  }

  const controller = new AbortController()
  conversionAbort.value = controller

  const res = await fetch(
    `${apiOrigin}/api/v1/projects/${projectId}/drawings/${drawingId}/conversion/events`,
    {
      method: 'GET',
      headers: authCookie.value ? { Authorization: `Bearer ${authCookie.value}` } : undefined,
      signal: controller.signal
    }
  )

  if (!res.ok || !res.body) {
    stopConversionSubscription()
    return
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  const applyUpdate = (payload: {
    conversionStatus?: string | null
    convertedBlobId?: string | null
    conversionError?: string | null
  }) => {
    if (!drawing.value) return
    drawing.value = {
      ...drawing.value,
      conversionStatus: payload.conversionStatus ?? drawing.value.conversionStatus,
      convertedBlobId: payload.convertedBlobId ?? drawing.value.convertedBlobId,
      conversionError: payload.conversionError ?? drawing.value.conversionError
    }
  }

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    while (true) {
      const sep = buffer.indexOf('\n\n')
      if (sep === -1) break
      const raw = buffer.slice(0, sep)
      buffer = buffer.slice(sep + 2)

      const dataLines = raw
        .split('\n')
        .filter((l) => l.startsWith('data:'))
        .map((l) => l.slice(5).trim())
      if (!dataLines.length) continue

      const jsonText = dataLines.join('\n')
      try {
        const payload = JSON.parse(jsonText) as Record<string, unknown>
        applyUpdate(payload as Parameters<typeof applyUpdate>[0])
        if (
          drawing.value?.conversionStatus === 'done' ||
          drawing.value?.conversionStatus === 'failed'
        ) {
          stopConversionSubscription()
          return
        }
      } catch {
      }
    }
  }
}

const retryConvert = async () => {
  if (!drawing.value) return
  await api.convertToDxf(projectId, drawingId)
  drawing.value = { ...drawing.value, conversionStatus: 'processing', conversionError: null }
  await startConversionSubscriptionIfNeeded()
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
    await startConversionSubscriptionIfNeeded()
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    loading.value = false
  }
})

onBeforeUnmount(() => {
  stopConversionSubscription()
})
</script>
