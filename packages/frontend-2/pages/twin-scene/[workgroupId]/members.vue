<template>
  <div
    class="flex w-full flex-col min-h-0 h-[calc(100dvh-4.5rem)] max-h-[calc(100dvh-4.5rem)]"
  >
    <div class="relative min-h-0 flex-1 bg-gray-50">
      <iframe
        v-if="iframeSrc"
        :src="iframeSrc"
        class="absolute inset-0 h-full w-full border-0"
        title="组员管理"
        frameborder="0"
        allowfullscreen
      />
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: ['auth', 'permission']
})

const TEAM_MEMBER_BASE_URL =
  'http://10.66.8.185:30080/ui/team-manage/team-member?embed=embed&theme=light'

const { iframeSrc } = useDtpIframeSrc(TEAM_MEMBER_BASE_URL)

useHead({
  title: '组员管理'
})
</script>
