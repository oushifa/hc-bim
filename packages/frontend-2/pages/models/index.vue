<template>
  <div></div>
</template>

<script setup lang="ts">
import { lightModelsRoute } from '~~/lib/common/helpers/route'

definePageMeta({
  middleware: ['auth', 'permission']
})

// 默认跳转到轻量模型
onMounted(() => {
  navigateTo(lightModelsRoute)
})
</script>
