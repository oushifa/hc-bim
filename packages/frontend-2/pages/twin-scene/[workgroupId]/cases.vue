<template>
  <div
    class="flex w-full flex-col min-h-0 h-[calc(100dvh-4.5rem)] max-h-[calc(100dvh-4.5rem)]"
    @wheel.stop
    @touchmove.stop
  >
    <!-- <div class="shrink-0 border-b border-gray-100 bg-white px-5 py-3">
      <h1 class="text-heading">团队案例</h1>
    </div> -->
    <div class="relative min-h-0 flex-1 bg-gray-50 overflow-hidden">
      <iframe
        v-if="caseCreateIframeSrc"
        :src="caseCreateIframeSrc"
        class="absolute inset-0 h-full w-full border-0"
        title="团队案例"
        frameborder="0"
        allowfullscreen
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  buildDtpIframeSrc,
  DTP_TOKEN_STORAGE_KEY
} from '~~/composables/useDtpIframeSrc'
import { useActiveUser } from '~~/lib/auth/composables/activeUser'

definePageMeta({
  middleware: ['auth', 'permission']
})

/** 团队案例 iframe 基础路径（使用相对路径通过代理，避免混合内容问题） */
const CASE_CREATE_BASE_URL =
  'http://10.66.8.185:30080/ui/case-create?embed=embed&theme=light'

const caseCreateIframeSrc = ref('')
const loading = ref(true)
const { activeUser } = useActiveUser()

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

onMounted(async () => {
  // 先确保 token 存在
  // await ensureDtpToken()
  // 然后构建 iframe URL
  caseCreateIframeSrc.value = buildDtpIframeSrc(CASE_CREATE_BASE_URL)
  loading.value = false
})

useHead({
  title: '团队案例'
})
</script>
