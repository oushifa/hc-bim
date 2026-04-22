<template>
  <Shield
    xmlns="http://www.w3.org/2000/svg"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="lucide lucide-shield"
  />
</template>

<script setup lang="ts">
import { Shield } from 'lucide-vue-next'

defineProps({
  size: {
    type: Number,
    default: 24
  }
})
</script>
