<template>
  <div
    class="group bg-white/80 backdrop-blur-[151.88px] rounded-[26px] overflow-hidden border border-white/40 shadow-[0px_60px_60px_-30px_rgba(64,74,72,0.1)] hover:shadow-md hover:border-[#00b4b6]/30 transition-all cursor-pointer relative"
  >
    <!-- 可点击区域 -->
    <NuxtLink :to="projectRoute(project.id) + '/workbench'" class="block">
      <div class="aspect-video relative overflow-hidden bg-[#f8f9fa]">
        <div
          v-if="firstModelPreviewUrl"
          class="relative z-20 bg-foundation-page w-full h-full border-b border-outline-2 overflow-hidden"
        >
          <PreviewImage :preview-url="firstModelPreviewUrl" />
        </div>
        <ProjectsAbstractCover v-else :project-id="project.id" />
      </div>
      <div class="p-4 relative">
        <h3
          class="text-base font-medium text-[#333] mb-1 group-hover:text-[#00b4b6] transition-colors pr-8 truncate"
          :title="project.name"
        >
          {{ project.name }}
        </h3>
        <p class="text-xs text-gray-500">{{ updatedAt.relative }}更新</p>
        <p v-if="creatorName" class="text-xs text-gray-400 mt-1">创建人：{{ creatorName }}</p>
      </div>
    </NuxtLink>

    <!-- 操作按钮区域（在 NuxtLink 外部） -->
    <div class="absolute bottom-3 right-3 z-30">
      <button
        type="button"
        class="p-1.5 bg-gray-50 hover:bg-white rounded-full shadow-sm text-gray-600 hover:text-[#00b4b6] transition-colors border border-gray-100"
        @click.prevent="toggleActionMenu"
      >
        <EllipsisHorizontalIcon class="w-4 h-4" />
      </button>

      <template v-if="isMenuActive">
        <div
          class="fixed inset-0 z-10"
          role="button"
          tabindex="0"
          aria-label="关闭操作菜单"
          @click.stop="closeActionMenu"
          @keydown.enter.stop="closeActionMenu"
          @keydown.space.prevent.stop="closeActionMenu"
        />
        <div
          class="absolute right-0 bottom-full mb-2 w-32 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-20 overflow-hidden"
        >
          <button
            v-if="isOwner || isServerAdmin"
            type="button"
            class="w-full flex items-center space-x-2 px-4 py-2 text-sm text-gray-600 hover:bg-[#f5f7fa] hover:text-[#00b4b6] transition-colors"
            @click.stop="openEditDialog"
          >
            <PencilIcon class="w-3.5 h-3.5" />
            <span>编辑</span>
          </button>
          <button
            type="button"
            class="w-full flex items-center space-x-2 px-4 py-2 text-sm text-gray-600 hover:bg-[#f5f7fa] hover:text-[#00b4b6] transition-colors"
            @click.stop="copyProjectLink"
          >
            <ShareIcon class="w-3.5 h-3.5" />
            <span>分享</span>
          </button>
          <button
            v-if="isOwner || isServerAdmin"
            type="button"
            class="w-full flex items-center space-x-2 px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
            @click.stop="openDeleteDialog"
          >
            <TrashIcon class="w-3.5 h-3.5" />
            <span>删除</span>
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  EllipsisHorizontalIcon,
  PencilIcon,
  ShareIcon,
  TrashIcon
} from '@heroicons/vue/24/outline'
import { projectRoute } from '~~/lib/common/helpers/route'
import { useActiveUser } from '~/lib/auth/composables/activeUser'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

const props = defineProps<{
  project: {
    id: string
    name: string
    updatedAt: string
    updatedOn?: string
    role?: string | null
    team?: {
      id: string
      user?: {
        id: string
        name: string
        avatar?: string | null
      } | null
    }[]
    models?: {
      items?: Array<{
        previewUrl?: string | null
      }>
    }
  }
  isMenuActive?: boolean
}>()

const emit = defineEmits<{
  edit: [project: typeof props.project]
  delete: [project: typeof props.project]
  share: [project: typeof props.project]
  toggleMenu: []
  closeMenu: []
}>()

const { isAdmin: isServerAdmin } = useActiveUser()
const isOwner = computed(() => props.project.role === 'stream:owner')

const updatedAt = computed(() => {
  const date = dayjs(props.project.updatedOn || props.project.updatedAt)
  return {
    relative: date.fromNow(),
    full: date.format('YYYY-MM-DD HH:mm:ss')
  }
})

const firstModelPreviewUrl = computed(() => {
  return props.project.models?.items?.[0]?.previewUrl || null
})

const creatorName = computed(() => {
  return props.project.team?.[0]?.user?.name || null
})

const toggleActionMenu = () => {
  emit('toggleMenu')
}

const closeActionMenu = () => {
  emit('closeMenu')
}

const openEditDialog = () => {
  closeActionMenu()
  emit('edit', props.project)
}

const openDeleteDialog = () => {
  closeActionMenu()
  emit('delete', props.project)
}

const copyProjectLink = () => {
  closeActionMenu()
  emit('share', props.project)
}
</script>
