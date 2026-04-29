<template>
  <div class="w-full h-full overflow-hidden">
    <ModelTwinModel />
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: ['auth', 'permission']
})
</script>
