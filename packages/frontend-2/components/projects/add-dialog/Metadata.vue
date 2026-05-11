<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-white/40 backdrop-blur-sm"
      @click="$emit('canceled')"
    >
      <div
        class="bg-white/80 backdrop-blur-md rounded-[26px] shadow-xl w-full max-w-md overflow-hidden border border-white/40"
        @click.stop
      >
        <div class="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-white/50">
          <h3 class="text-xl font-bold text-gray-800">新建项目</h3>
          <button
            class="p-2 hover:bg-gray-100 rounded-full transition-colors"
            @click="$emit('canceled')"
          >
            <XMarkIcon class="w-5 h-5 text-gray-400" />
          </button>
        </div>
        <form class="p-8 space-y-6" @submit="onSubmit">
          <div class="space-y-2">
            <label class="text-sm font-medium text-gray-600">项目名称</label>
            <input
              v-model="formData.name"
              type="text"
              class="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:outline-none focus:border-primary focus:bg-white transition-all text-gray-700"
              placeholder="输入项目名称"
              required
              autofocus
            />
          </div>
          <div class="flex space-x-4 pt-4">
            <button
              type="button"
              class="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              @click="$emit('canceled')"
            >
              取消
            </button>
            <button
              type="submit"
              class="flex-1 py-3 bg-[#00b4b6] text-white rounded-xl font-medium hover:bg-[#009fa1] transition-colors shadow-lg shadow-[#00b4b6]/20 disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="isDisabled || !formData.name.trim()"
            >
              {{ isDisabled ? '创建中...' : '创建项目' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>
<script setup lang="ts">
import { XMarkIcon } from '@heroicons/vue/24/outline'
import type { MaybeNullOrUndefined } from '@speckle/shared'
import { useMixpanel } from '~~/lib/core/composables/mp'
import { useCreateProject } from '~~/lib/projects/composables/projectManagement'

const props = defineProps<{
  supportGoBack?: boolean
  workspaceId?: MaybeNullOrUndefined<string>
}>()

const emit = defineEmits<{
  (e: 'created', project: { id: string }): void
  (e: 'canceled'): void
  (e: 'back'): void
}>()

const createProject = useCreateProject()
const logger = useLogger()
const mp = useMixpanel()

const formData = ref({
  name: ''
})

const isLoading = ref(false)
const isDisabled = computed(() => isLoading.value)

const onSubmit = async (e: Event) => {
  e.preventDefault()
  
  if (isLoading.value || !formData.value.name.trim()) return

  try {
    isLoading.value = true

    const newProject = await createProject({
      name: formData.value.name.trim(),
      description: '',
      visibility: 'WORKSPACE',
      address: '',
      ...(props.workspaceId ? { workspaceId: props.workspaceId } : {})
    })

    if (newProject?.id) {
      emit('created', { id: newProject.id })
      mp.track('Stream Action', {
        type: 'action',
        name: 'create',
        workspace_id: props.workspaceId
      })
      
      // 重置表单
      formData.value.name = ''
    }
  } catch (error) {
    logger.error('Failed to create project:', error)
  } finally {
    isLoading.value = false
  }
}
</script>
