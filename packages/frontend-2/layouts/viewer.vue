<template>
  <div class="relative min-h-full">
    <main class="absolute top-0 left-0 z-10 h-[100dvh] w-screen">
      <slot />
    </main>
  </div>
</template>
<script setup lang="ts">
import { useEmbed } from '~/lib/viewer/composables/setup/embed'

const { isEnabled: isEmbedEnabled } = useEmbed()
</script>
