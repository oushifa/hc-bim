/** localStorage 中 DTP 登录 token 的键名 */
export const DTP_TOKEN_STORAGE_KEY = 'dtp-token'

/**
 * 根据运行时配置或当前访问地址动态获取 DTP UI 服务的 origin
 *
 * 优先级：
 * 1. 环境变量 NUXT_PUBLIC_DTP_UI_ORIGIN（可选覆盖，仅在 DTP 与前端分离部署时使用）
 * 2. window.location.origin（默认，DTP UI 与前端部署在同一 host:port）
 *
 * 配置示例（DTP 分离部署时）：
 *   NUXT_PUBLIC_DTP_UI_ORIGIN=http://61.145.255.42:30080
 */
export function getDtpUIOrigin(): string {
  // 优先使用运行时配置的 dtpUIOrigin（分离部署场景）
  const runtimeConfig = useRuntimeConfig()
  const configuredOrigin = runtimeConfig.public.dtpUIOrigin as string
  if (configuredOrigin) {
    return configuredOrigin.replace(/\/+$/, '')
  }

  // 默认：与前端同源（同 host + 同 port）
  if (typeof window !== 'undefined' && window.location.origin) {
    return window.location.origin
  }

  // SSR fallback，页面挂载后会重新计算
  return ''
}

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
