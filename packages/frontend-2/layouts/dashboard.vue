<template>
  <div class="bg-[#E7EBEB]">
    <ClientOnly>
      <HeaderNavBar v-if="!isEmbedEnabled" :hide-user-nav="!isLoggedIn" />
    </ClientOnly>
    <div class="h-dvh w-dvh overflow-hidden flex flex-col bg-[#E7EBEB]">
      <!-- Static Spacer to allow for absolutely positioned HeaderNavBar  -->
      <div v-if="!isEmbedEnabled" class="h-[4.5rem] w-full shrink-0"></div>

      <div
        class="relative flex"
        :class="isEmbedEnabled ? 'h-[100dvh]' : 'h-[calc(100dvh-4.5rem)]'"
      >
        <main class="w-full h-full overflow-y-auto simple-scrollbar">
          <div class="container w-full">
            <slot />
          </div>
        </main>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useDashboardEmbed } from '~/lib/dashboards/composables/embed'

const { isEmbedEnabled } = useDashboardEmbed()
const { isLoggedIn } = useActiveUser()
</script>
