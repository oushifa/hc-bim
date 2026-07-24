<template>
  <div
    class="flex w-full flex-col min-h-0 h-[calc(100dvh-4.5rem)] max-h-[calc(100dvh-4.5rem)]"
    @wheel.stop
    @touchmove.stop
  >
    <div class="relative min-h-0 flex-1 bg-gray-50 overflow-hidden">
      <iframe
        v-if="iframeSrc"
        :src="iframeSrc"
        class="absolute inset-0 h-full w-full border-0"
        title="系统管理"
        frameborder="0"
        allowfullscreen
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  buildDtpIframeSrc,
  getDtpUIOrigin
} from '~~/composables/useDtpIframeSrc'

definePageMeta({
  middleware: ['auth', 'permission']
})

/** 系统管理 iframe 路径（host 由 getDtpUIOrigin() 动态获取） */
const SYSTEM_SET_PATH = '/ui/system-setting/system-set?embed=embed&theme=light'

const iframeSrc = ref('')

/** 确保 DTP token 存在，如果不存在或过期则重新获取 */
// const ensureDtpToken = async (): Promise<boolean> => {
//   if (!import.meta.client) return false

//   const existing = localStorage.getItem(DTP_TOKEN_STORAGE_KEY)
//   if (existing) return true

//   const user = activeUser.value
//   const mobile = user?.email
//   if (!mobile) return false

//   try {
//     const CryptoJS = await import('crypto-js')
//     const AES_KEY = 'Ze/0w7rnQg7jznntRcuxGQ=='
//     const data = JSON.stringify({ mobile })
//     const dataParsed = CryptoJS.enc.Utf8.parse(data)
//     const keyParsed = CryptoJS.enc.Utf8.parse(AES_KEY)
//     const encrypted = CryptoJS.AES.encrypt(dataParsed, keyParsed, {
//       mode: CryptoJS.mode.ECB,
//       padding: CryptoJS.pad.Pkcs7
//     })
//     const bimpToken = encrypted.toString()

//     const { useDtpApiOrigin } = await import('~~/composables/env')
//     const dtpOrigin = useDtpApiOrigin()
//     const loginUrl = `${dtpOrigin}/v1/login/third-party`
//     const response = await fetch(loginUrl, {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//         Accept: 'application/json'
//       },
//       body: JSON.stringify({ token: bimpToken })
//     })

//     if (!response.ok) return false

//     const responseData = await response.json()
//     if (responseData?.success && responseData?.code === 200) {
//       const dtpToken = responseData.results?.tokens?.[0] as string | undefined
//       if (dtpToken) {
//         localStorage.setItem(DTP_TOKEN_STORAGE_KEY, dtpToken)
//         return true
//       }
//     }
//     return false
//   } catch (err) {
//     console.warn('DTP token 获取失败:', err)
//     return false
//   }
// }

onMounted(() => {
  const origin = getDtpUIOrigin()
  if (origin) {
    iframeSrc.value = buildDtpIframeSrc(`${origin}${SYSTEM_SET_PATH}`)
  }
})

useHead({
  title: '系统管理'
})
</script>
