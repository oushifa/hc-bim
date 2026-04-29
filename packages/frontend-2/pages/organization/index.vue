<template>
  <div>
    <OrganizationPage />
  </div>
</template>

<script setup lang="ts">
useHead({
  title: '组织管理'
})

definePageMeta({
  middleware: ['auth', 'permission']
})
</script>
