<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-white/40 backdrop-blur-sm"
      role="button"
      tabindex="0"
      @click="$emit('update:open', false)"
      @keydown.enter="$emit('update:open', false)"
      @keydown.space.prevent="$emit('update:open', false)"
    >
      <div
        class="bg-white/80 backdrop-blur-md rounded-[26px] shadow-xl w-full max-w-sm overflow-hidden border border-white/40"
        @click.stop
      >
        <div class="p-8 text-center bg-white/50">
          <div
            class="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <TrashIcon class="w-8 h-8" />
          </div>
          <h3 class="text-xl font-bold text-gray-800 mb-2">确认删除？</h3>
          <p class="text-gray-500 text-sm mb-8">
            确定要删除项目
            <span class="font-bold text-gray-700">"{{ project?.name }}"</span>
            吗？此操作不可撤销。
          </p>
          <div class="flex space-x-4">
            <button
              class="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              @click="$emit('update:open', false)"
            >
              取消
            </button>
            <button
              class="flex-1 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
              @click="handleDelete"
            >
              确认删除
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { TrashIcon } from '@heroicons/vue/24/outline'
import { graphql } from '~~/lib/common/generated/gql/gql'
import type { ProjectsDeleteDialog_ProjectFragment } from '~~/lib/common/generated/gql/graphql'

graphql(`
  fragment ProjectsDeleteDialog_Project on Project {
    id
    name
    role
    models(limit: 0) {
      totalCount
    }
    versions(limit: 0) {
      totalCount
    }
    permissions {
      canDelete {
        ...FullPermissionCheckResult
      }
    }
  }
`)

const props = defineProps<{
  open: boolean
  project: ProjectsDeleteDialog_ProjectFragment | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  delete: [id: string]
}>()

const handleDelete = () => {
  if (!props.project) return
  emit('delete', props.project.id)
}
</script>
