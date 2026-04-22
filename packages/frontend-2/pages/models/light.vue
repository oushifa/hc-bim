<template>
  <div class="w-full h-full overflow-hidden">
    <ModelLightModel />
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: ['auth']
})
</script>
