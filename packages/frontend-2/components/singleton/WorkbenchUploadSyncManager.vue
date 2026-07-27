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
const RESUME_INTERVAL_MS = 15000

let resumeTimer: number | null = null

const resumeTasks = () => {
  void resumeInterruptedTasks()
}

watch(
  tasksSignature,
  () => {
    resumeTasks()
  },
  {
    immediate: true
  }
)

onMounted(() => {
  resumeTimer = window.setInterval(() => {
    if (!activeProjectIds.value.length) return
    resumeTasks()
  }, RESUME_INTERVAL_MS)
})

onBeforeUnmount(() => {
  if (resumeTimer !== null) {
    window.clearInterval(resumeTimer)
  }
})
</script>
