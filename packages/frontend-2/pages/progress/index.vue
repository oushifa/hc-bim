<template>
  <div>
    <Portal to="navigation">
      <!-- <HeaderNavLink :to="projectsRoute" name="Projects" :separator="false" /> -->
      <div>海创制造</div>
    </Portal>
    <ProgressPage />
  </div>
</template>

<script setup lang="ts">
useHead({
  title: '进度管理'
})

definePageMeta({
  middleware: ['auth']
})
</script>
