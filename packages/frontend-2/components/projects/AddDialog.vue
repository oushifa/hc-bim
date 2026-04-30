<template>
  <ProjectsAddDialogMetadata
    v-if="open"
    :workspace-id="workspaceId"
    :support-go-back="false"
    @created="onCreated"
    @canceled="onCanceled"
  />
</template>
<script setup lang="ts">
import type { MaybeNullOrUndefined } from '@speckle/shared'

const emit = defineEmits<{
  (e: 'created', project: { id: string }): void
}>()

const props = defineProps<{
  workspaceId?: MaybeNullOrUndefined<string>
}>()

const workspaceId = ref(props.workspaceId)
const open = defineModel<boolean>('open', { required: true })

const onCanceled = () => {
  open.value = false
}

const onCreated = (project: { id: string }) => {
  emit('created', project)
  open.value = false
}
</script>
