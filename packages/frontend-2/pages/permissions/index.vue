<template>
  <div>
    <PermissionsPage />
  </div>
</template>

<script setup lang="ts">
useHead({
  title: '权限管理'
})

definePageMeta({
  middleware: ['auth']
})
</script>
