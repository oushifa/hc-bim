<template>
  <div class="fixed inset-0 z-50 bg-white">
    <AuthLoginPanel />
  </div>
</template>
<script setup lang="ts">
useHead({ title: '登录' })

definePageMeta({
  name: 'login',
  layout: false
})
</script>
