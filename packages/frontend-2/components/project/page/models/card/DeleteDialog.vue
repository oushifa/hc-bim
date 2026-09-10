<template>
  <LayoutDialog
    v-model:open="isOpen"
    :buttons="[
      {
        text: '取消',
        props: { color: 'outline' },
        onClick: () => {
          isOpen = false
        }
      },
      {
        text: '删除',
        props: { color: 'danger', disabled: loading },
        onClick: () => {
          onDelete()
        }
      }
    ]"
    max-width="sm"
  >
    <template #header>删除模型</template>
    <div class="flex flex-col text-foreground">
      <p class="mb-2">
        您确定要删除模型
        <span class="inline font-medium">{{ model.name }}</span>
        吗？
      </p>
      <p>此操作不可逆，所有此模型中的版本都将被删除。</p>
    </div>
  </LayoutDialog>
</template>
<script setup lang="ts">
import { graphql } from '~~/lib/common/generated/gql'
import type { ProjectPageModelsCardDeleteDialogFragment } from '~~/lib/common/generated/gql/graphql'
import { useDeleteModel } from '~~/lib/projects/composables/modelManagement'
import { useStopModelSyncTask } from '~~/lib/projects/composables/stopModelSync'

graphql(`
  fragment ProjectPageModelsCardDeleteDialog on Model {
    id
    name
  }
`)

const emit = defineEmits<{
  (e: 'deleted'): void
}>()

const props = defineProps<{
  projectId: string
  model: ProjectPageModelsCardDeleteDialogFragment
}>()

const isOpen = defineModel<boolean>('open', { required: true })
const deleteModel = useDeleteModel()
const stopModelSyncTask = useStopModelSyncTask()

const loading = ref(false)

const onDelete = async () => {
  loading.value = true

  // 模型处于转换/同步阶段时，删除前先停止对应的后台任务（停止失败不阻塞删除）
  await stopModelSyncTask({
    projectId: props.projectId,
    modelId: props.model.id,
    reason: '模型已删除，任务已停止'
  })

  const deleted = await deleteModel({
    id: props.model.id,
    projectId: props.projectId
  }).finally(() => (loading.value = false))
  isOpen.value = false

  if (deleted) emit('deleted')
}
</script>
