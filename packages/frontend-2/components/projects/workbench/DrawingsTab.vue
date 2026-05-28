<template>
  <div>
    <div
      v-if="isLoading && !displayedDrawings.length"
      class="bg-white/80 backdrop-blur-md border border-gray-200 rounded-[8px] p-12 text-center text-gray-500"
    >
      图纸加载中...
    </div>
    <div
      v-else-if="displayedDrawings.length === 0"
      class="bg-white/80 backdrop-blur-md border border-gray-200 rounded-[8px] p-12 text-center text-gray-500"
    >
      该目录下暂无图纸，请上传图纸。
    </div>
    <div
      v-else-if="viewMode === 'grid'"
      class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
    >
      <div
        v-for="drawing in displayedDrawings"
        :key="drawing.id"
        class="bg-white/80 backdrop-blur-md border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow flex flex-col h-[280px] cursor-pointer"
        role="button"
        tabindex="0"
        @click="openDrawing(drawing)"
        @keydown.enter.prevent="openDrawing(drawing)"
        @keydown.space.prevent="openDrawing(drawing)"
      >
        <div class="p-3 flex justify-between items-start shrink-0">
          <div class="min-w-0 pr-2">
            <h3 class="text-sm font-medium text-[#333] line-clamp-2 whitespace-pre-line leading-snug">
              {{ drawing.name }}
            </h3>
            <div v-if="drawing.conversionLabel" class="mt-1 flex items-center space-x-1">
              <CommonLoadingIcon
                v-if="drawing.conversionStatus === 'processing'"
                class="w-3.5 h-3.5 opacity-70"
              />
              <span
                class="text-xs px-2 py-0.5 rounded"
                :class="getConversionLabelClass(drawing)"
              >
                {{ drawing.conversionLabel }}
              </span>
            </div>
          </div>
          <button class="text-gray-400 hover:text-gray-600 p-1 shrink-0">
            <EllipsisHorizontalIcon class="h-4 w-4" />
          </button>
        </div>
        <div
          class="flex-1 flex flex-col items-center justify-center p-4 min-h-0 bg-gradient-to-br from-gray-50 to-gray-100"
        >
          <div
            v-if="drawing.previewUrl"
            class="w-full h-full rounded-md overflow-hidden border border-gray-200"
          >
            <PreviewImage :preview-url="drawing.previewUrl" />
          </div>
          <CubeIcon v-else class="w-20 h-20 text-gray-300" />
        </div>
        <div class="p-3 border-t border-gray-100 flex justify-between items-end shrink-0">
          <span class="text-xs text-gray-500">
            {{ formatDate(drawing.updatedAt) }}
          </span>
          <div class="flex items-center space-x-2">
            <button
              title="查看"
              class="p-1.5 text-[#00b4b6] hover:bg-[#e6f7f8] rounded"
              @click.stop="openDrawing(drawing)"
            >
              <EyeIcon class="h-4 w-4" />
            </button>
            <button
              title="删除"
              class="p-1.5 text-red-500 hover:bg-red-50 rounded"
              @click.stop="deleteDrawing(drawing)"
            >
              <TrashIcon class="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
    <div
      v-else
      class="bg-white/80 backdrop-blur-md border border-gray-200 rounded-lg overflow-hidden"
    >
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="bg-[#f8f9fa] text-gray-500 text-sm border-b border-gray-200">
            <th class="px-4 py-3 font-medium text-left min-w-[200px]">图纸名称</th>
            <th class="px-4 py-3 font-medium text-left w-[200px]">更新时间</th>
            <th class="px-4 py-3 font-medium text-left w-[160px]">操作</th>
          </tr>
        </thead>
        <tbody class="text-sm text-[#333] divide-y divide-gray-100">
          <tr
            v-for="drawing in displayedDrawings"
            :key="drawing.id"
            class="hover:bg-[#fcfcfc] transition-colors group cursor-pointer"
            @click="openDrawing(drawing)"
          >
            <td class="px-4 py-3">
              <div class="flex items-center space-x-3">
                <div
                  v-if="drawing.previewUrl"
                  class="w-12 h-8 rounded overflow-hidden border border-gray-200 bg-gray-50 shrink-0"
                >
                  <PreviewImage :preview-url="drawing.previewUrl" />
                </div>
                <CubeIcon v-else class="h-4 w-4 text-gray-400 shrink-0" />
                <div class="min-w-0 flex-1">
                  <div class="font-medium whitespace-pre-line">{{ drawing.name }}</div>
                  <div v-if="drawing.conversionLabel" class="mt-1 flex items-center space-x-1">
                    <CommonLoadingIcon
                      v-if="drawing.conversionStatus === 'processing'"
                      class="w-3.5 h-3.5 opacity-70"
                    />
                    <span
                      class="text-xs px-2 py-0.5 rounded inline-block"
                      :class="getConversionLabelClass(drawing)"
                    >
                      {{ drawing.conversionLabel }}
                    </span>
                  </div>
                </div>
              </div>
            </td>
            <td class="px-4 py-3 text-left text-gray-500">
              {{ formatDate(drawing.updatedAt) }}
            </td>
            <td class="px-4 py-3 text-left">
              <div class="flex items-center justify-start space-x-2">
                <button
                  title="查看"
                  class="p-1.5 text-[#00b4b6] hover:bg-[#e6f7f8] rounded"
                  @click.stop="openDrawing(drawing)"
                >
                  <EyeIcon class="h-4 w-4" />
                </button>
                <button
                  title="删除"
                  class="p-1.5 text-red-500 hover:bg-red-50 rounded"
                  @click.stop="deleteDrawing(drawing)"
                >
                  <TrashIcon class="h-4 w-4" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount } from 'vue'
import {
  CubeIcon,
  EllipsisHorizontalIcon,
  EyeIcon,
  TrashIcon
} from '@heroicons/vue/24/outline'
import dayjs from 'dayjs'
import { ToastNotificationType, useGlobalToast } from '~~/lib/common/composables/toast'
import { useWorkbenchDrawingsApi, type WorkbenchDrawing } from './drawingsApi'
import { useAuthCookie } from '~/lib/auth/composables/auth'

type ViewMode = 'grid' | 'list'

type DrawingListItem = {
  id: string
  name: string
  updatedAt: string
  previewUrl?: string | null
  folderId: string | null
  fileType: string
  conversionStatus: string | null
  conversionLabel: string | null
}

const props = defineProps<{
  projectId: string
  activeDir: string
  rootId: string
  viewMode: ViewMode
  searchQuery: string
  refreshKey: number
}>()

const { triggerNotification } = useGlobalToast()
const router = useRouter()
const api = useWorkbenchDrawingsApi()
const apiOrigin = useApiOrigin()
const authCookie = useAuthCookie()

const drawings = ref<WorkbenchDrawing[]>([])
const isLoading = ref(false)
const fetchDebounce = ref<ReturnType<typeof setTimeout> | null>(null)
const conversionAbort = ref<AbortController | null>(null)
const shouldReconnect = ref(true)

const displayedDrawings = computed<DrawingListItem[]>(() => {
  return drawings.value.map((d) => ({
    id: d.id,
    name: d.name,
    updatedAt: d.updatedAt,
    previewUrl: null,
    folderId: d.folderId,
    fileType: d.fileType,
    conversionStatus: d.conversionStatus,
    conversionLabel: getConversionLabel(d)
  }))
})

const getConversionLabel = (drawing: Pick<WorkbenchDrawing, 'fileType' | 'conversionStatus'>) => {
  if (drawing.fileType?.toLowerCase() !== 'dwg') return null
  switch (drawing.conversionStatus) {
    case 'processing':
      return '转换中'
    case 'done':
      return '已转换'
    case 'failed':
      return '转换失败'
    case 'pending':
    case null:
    default:
      return '待转换'
  }
}

const getConversionLabelClass = (drawing: Pick<DrawingListItem, 'conversionStatus'>) => {
  if (drawing.conversionStatus === 'failed') return 'bg-red-50 text-red-600'
  if (drawing.conversionStatus === 'done') return 'bg-emerald-50 text-emerald-700'
  return 'bg-[#e6f7f8] text-[#00b4b6]'
}

const formatDate = (dateStr: string) => {
  return dayjs(dateStr).format('YYYY-MM-DD HH:mm')
}

const refresh = async () => {
  if (!props.projectId) return
  if (fetchDebounce.value) clearTimeout(fetchDebounce.value)

  fetchDebounce.value = setTimeout(async () => {
    isLoading.value = true
    try {
      const folderId = props.activeDir === props.rootId ? null : props.activeDir
      const res = await api.listDrawings({
        projectId: props.projectId,
        folderId,
        search: props.searchQuery,
        limit: 100
      })
      drawings.value = res.items
    } catch (e) {
      triggerNotification({
        type: ToastNotificationType.Danger,
        title: '图纸加载失败',
        description: (e as Error).message
      })
    } finally {
      isLoading.value = false
    }
  }, 200)
}

const stopConversionSubscription = () => {
  shouldReconnect.value = false
  conversionAbort.value?.abort()
  conversionAbort.value = null
}

const startConversionSubscription = async () => {
  if (!import.meta.client) return
  if (!props.projectId) return

  shouldReconnect.value = true
  conversionAbort.value?.abort()
  conversionAbort.value = null

  const controller = new AbortController()
  conversionAbort.value = controller

  try {
    const res = await fetch(
      `${apiOrigin}/api/v1/projects/${props.projectId}/drawings/conversion/events`,
      {
        method: 'GET',
        headers: authCookie.value ? { Authorization: `Bearer ${authCookie.value}` } : undefined,
        signal: controller.signal
      }
    )

    if (!res.ok || !res.body) throw new Error('subscribe failed')

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

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
          const payload = JSON.parse(jsonText) as {
            drawingId?: string
            conversionStatus?: string | null
            convertedBlobId?: string | null
            conversionError?: string | null
          }
          if (!payload.drawingId) continue

          const idx = drawings.value.findIndex((d) => d.id === payload.drawingId)
          if (idx === -1) continue

          const cur = drawings.value[idx]
          drawings.value[idx] = {
            ...cur,
            conversionStatus: payload.conversionStatus ?? cur.conversionStatus,
            convertedBlobId: payload.convertedBlobId ?? cur.convertedBlobId,
            conversionError: payload.conversionError ?? cur.conversionError
          }
        } catch {
        }
      }
    }
  } catch {
    if (!shouldReconnect.value) return
    if (controller.signal.aborted) return
    setTimeout(() => void startConversionSubscription(), 2000)
  }
}

watch(
  () => [props.projectId, props.activeDir, props.searchQuery, props.refreshKey],
  () => void refresh(),
  { immediate: true }
)

watch(
  () => props.projectId,
  () => void startConversionSubscription(),
  { immediate: true }
)

onBeforeUnmount(() => {
  stopConversionSubscription()
})

const openDrawing = (drawing: DrawingListItem) => {
  router.push(`/projects/${props.projectId}/drawings/${drawing.id}`)
}

const deleteDrawing = async (drawing: DrawingListItem) => {
  try {
    await api.deleteDrawing(props.projectId, drawing.id)
    drawings.value = drawings.value.filter((d) => d.id !== drawing.id)
    triggerNotification({
      type: ToastNotificationType.Success,
      title: '删除成功',
      description: drawing.name
    })
  } catch (e) {
    triggerNotification({
      type: ToastNotificationType.Danger,
      title: '删除失败',
      description: (e as Error).message
    })
  }
}
</script>
