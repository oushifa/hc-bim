<template>
  <div>
    <Portal to="navigation">
      <!-- <HeaderNavLink :to="projectsRoute" name="Projects" :separator="false" /> -->
      <div>海创制造</div>
    </Portal>
    <WorkValuationPage />
  </div>
</template>

<script setup lang="ts">
useHead({
  title: '验工计价'
})

definePageMeta({
  middleware: ['auth']
})
</script>
