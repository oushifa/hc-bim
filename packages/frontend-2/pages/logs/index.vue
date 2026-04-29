<template>
  <div>
    <LogsPage />
  </div>
</template>

<script setup lang="ts">
useHead({
  title: '日志管理'
})

definePageMeta({
  middleware: ['auth', 'permission']
})
</script>
