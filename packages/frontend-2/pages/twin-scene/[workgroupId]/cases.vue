<template>
  <div
    class="flex w-full flex-col min-h-0 h-[calc(100dvh-4.5rem)] max-h-[calc(100dvh-4.5rem)]"
  >
    <!-- <div class="shrink-0 border-b border-gray-100 bg-white px-5 py-3">
      <h1 class="text-heading">组内案例</h1>
    </div> -->
    <div class="relative min-h-0 flex-1 bg-gray-50">
      <iframe
        v-if="caseCreateIframeSrc"
        :src="caseCreateIframeSrc"
        class="absolute inset-0 h-full w-full border-0"
        title="组内案例"
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

/** localStorage 中 DTP 登录 token 的键名 */
const DTP_TOKEN_STORAGE_KEY = 'dtp-token'

/** 组内案例 iframe 基础路径（不含 token） */
const CASE_CREATE_BASE_URL =
  'http://10.66.8.185:30080/ui/case-create?embed=embed&theme=light'

const caseCreateIframeSrc = ref('')

const buildCaseCreateUrl = () => {
  const token =
    typeof localStorage !== 'undefined'
      ? localStorage.getItem(DTP_TOKEN_STORAGE_KEY) ?? ''
      : ''
  return `${CASE_CREATE_BASE_URL}&token=${encodeURIComponent(token)}`
}

onMounted(() => {
  caseCreateIframeSrc.value = buildCaseCreateUrl()
})

useHead({
  title: '组内案例'
})
</script>
