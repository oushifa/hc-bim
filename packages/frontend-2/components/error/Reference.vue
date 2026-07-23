<template>
  <CommonCopyButton :title="title" :size="size" />
</template>
<script setup lang="ts">
withDefaults(
  defineProps<{
    title?: string
    size?: string
  }>(),
  {
    title: '.',
    size: 'text-body-3xs'
  }
)
</script>
