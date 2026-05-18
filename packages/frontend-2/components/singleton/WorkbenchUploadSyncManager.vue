<template>
  <div class="hidden">
    <SingletonWorkbenchUploadSyncProjectSubscriber
      v-for="projectId in activeProjectIds"
      :key="projectId"
      :project-id="projectId"
    />
  </div>
</template>
<script setup lang="ts">
import { useWorkbenchUploadSync } from '~/lib/projects/composables/workbenchUploadSync'

const { activeProjectIds, tasksSignature, resumeInterruptedTasks } = useWorkbenchUploadSync()

watch(
  tasksSignature,
  () => {
    void resumeInterruptedTasks()
  },
  {
    immediate: true
  }
)
</script>
