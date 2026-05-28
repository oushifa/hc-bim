<template>
  <div class="relative h-[100dvh] w-full overflow-hidden">
    <main class="absolute inset-0 z-10 h-full w-full overflow-hidden">
      <slot />
    </main>
  </div>
</template>
<script setup lang="ts">
import { useEmbed } from '~/lib/viewer/composables/setup/embed'

const { isEnabled: isEmbedEnabled } = useEmbed()
</script>
