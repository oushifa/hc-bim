<template>
  <div>
    <Portal to="navigation">
      <!-- <HeaderNavLink :to="projectsRoute" name="Projects" :separator="false" /> -->
      <div>中建海创</div>
    </Portal>
    <ArchivesPage />
  </div>
</template>

<script setup lang="ts">
useHead({
  title: '档案管理'
})

definePageMeta({
  middleware: ['auth']
})
</script>
