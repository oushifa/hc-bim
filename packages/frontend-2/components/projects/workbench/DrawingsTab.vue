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
          <h3 class="text-sm font-medium text-[#333] line-clamp-2 pr-2 whitespace-pre-line leading-snug">
            {{ drawing.name }}
          </h3>
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
                <span class="font-medium whitespace-pre-line">{{ drawing.name }}</span>
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
import { computed, ref, watch } from 'vue'
import {
  CubeIcon,
  EllipsisHorizontalIcon,
  EyeIcon,
  TrashIcon
} from '@heroicons/vue/24/outline'
import dayjs from 'dayjs'
import { ToastNotificationType, useGlobalToast } from '~~/lib/common/composables/toast'
import { useWorkbenchDrawingsApi, type WorkbenchDrawing } from './drawingsApi'

type ViewMode = 'grid' | 'list'

type DrawingListItem = {
  id: string
  name: string
  updatedAt: string
  previewUrl?: string | null
  folderId: string | null
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

const drawings = ref<WorkbenchDrawing[]>([])
const isLoading = ref(false)
const fetchDebounce = ref<ReturnType<typeof setTimeout> | null>(null)

const displayedDrawings = computed<DrawingListItem[]>(() => {
  return drawings.value.map((d) => ({
    id: d.id,
    name: d.name,
    updatedAt: d.updatedAt,
    previewUrl: null,
    folderId: d.folderId
  }))
})

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

watch(
  () => [props.projectId, props.activeDir, props.searchQuery, props.refreshKey],
  () => void refresh(),
  { immediate: true }
)

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
