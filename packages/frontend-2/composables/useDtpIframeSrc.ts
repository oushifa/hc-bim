/** localStorage 中 DTP 登录 token 的键名 */
export const DTP_TOKEN_STORAGE_KEY = 'dtp-token'

/**
 * 为已带 query 的 DTP 页面 URL 追加 token（来自 localStorage）
 */
export function buildDtpIframeSrc(baseUrl: string): string {
  const token =
    typeof localStorage !== 'undefined'
      ? localStorage.getItem(DTP_TOKEN_STORAGE_KEY) ?? ''
      : ''
  const joiner = baseUrl.includes('?') ? '&' : '?'
  return `${baseUrl}${joiner}token=${encodeURIComponent(token)}`
}

/**
 * 仅在客户端挂载后生成 iframe src，避免 SSR 读取 localStorage
 */
export function useDtpIframeSrc(baseUrl: string) {
  const iframeSrc = ref('')
  onMounted(() => {
    iframeSrc.value = buildDtpIframeSrc(baseUrl)
  })
  return { iframeSrc }
}
