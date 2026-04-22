<template>
  <div>
    <Portal to="navigation">
      <!-- <HeaderNavLink :to="projectsRoute" name="Projects" :separator="false" /> -->
      <div>中建海创</div>
    </Portal>
    <WorkbenchPage />
  </div>
</template>

<script setup lang="ts">
useHead({
  title: '工作台'
})

definePageMeta({
  middleware: ['auth']
})
</script>
