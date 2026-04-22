<template>
  <ProjectsWorkbenchPage :project-id="projectId" />
</template>

<script setup lang="ts">
const route = useRoute()
const projectId = route.params.id as string
</script>
