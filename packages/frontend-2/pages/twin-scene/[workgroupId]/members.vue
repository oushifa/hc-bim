<template>
  <div
    class="flex w-full flex-col min-h-0 h-full max-h-full"
    @wheel.stop
    @touchmove.stop
  >
    <div class="relative min-h-0 flex-1 bg-gray-50 overflow-hidden">
      <iframe
        v-if="iframeSrc"
        :src="iframeSrc"
        class="absolute inset-0 h-full w-full border-0"
        title="团队管理"
        frameborder="0"
        allowfullscreen
      />
      <div
        v-else-if="loadError"
        class="absolute inset-0 flex flex-col items-center justify-center gap-3"
      >
        <p class="text-body-sm text-foreground-2">团队管理服务连接失败，请稍后重试</p>
        <FormButton size="sm" color="outline" @click="loadIframe">重试</FormButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  buildDtpIframeSrcEnsured,
  getDtpUIOrigin
} from '~~/composables/useDtpIframeSrc'

definePageMeta({
  middleware: ['auth', 'permission']
})

/** 团队管理 iframe 路径（host 由 getDtpUIOrigin() 动态获取） */
const TEAM_MEMBER_PATH = '/ui/team-manage/team-member?embed=embed&theme=light'

const iframeSrc = ref('')
const loadError = ref(false)

// 获取 DTP token 并生成 iframe src；token 获取失败（返回 null）时展示错误提示
const loadIframe = async () => {
  loadError.value = false
  const origin = getDtpUIOrigin()
  if (!origin) {
    loadError.value = true
    return
  }
  const src = await buildDtpIframeSrcEnsured(`${origin}${TEAM_MEMBER_PATH}`)
  if (src) {
    iframeSrc.value = src
  } else {
    loadError.value = true
  }
}

onMounted(loadIframe)

useHead({
  title: '团队管理'
})
</script>
