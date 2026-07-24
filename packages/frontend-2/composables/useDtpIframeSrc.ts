/** localStorage 中 DTP 登录 token 的键名 */
export const DTP_TOKEN_STORAGE_KEY = 'dtp-token'

/**
 * hostname → DTP UI origin 映射表
 * key：前端访问的 hostname，value：对应的 DTP UI 完整 origin
 * 两个 hostname 可以指向同一个 DTP 服务器
 */
const DTP_UI_ORIGIN_MAP: Record<string, string> = {
  '61.145.255.42': 'http://61.145.255.42:30080',
  '192.168.20.157': 'http://192.168.20.157:30080',
  '192.168.20.155': 'http://192.168.20.157:30080'
}

/**
 * 根据运行时配置或 hostname 映射动态获取 DTP UI 服务的 origin
 *
 * 优先级：
 * 1. 环境变量 NUXT_PUBLIC_DTP_UI_ORIGIN（手动覆盖）
 * 2. hostname 映射表 DTP_UI_ORIGIN_MAP（自动匹配已知环境）
 * 3. window.location.origin（回退，同 host + 同 port）
 *
 * 示例：
 *   访问 http://61.145.255.42:任端口 → http://61.145.255.42:30080
 *   访问 http://192.168.20.157:任端口 → http://192.168.20.157:30080
 *   访问 http://192.168.20.155:任端口 → http://192.168.20.157:30080
 */
export function getDtpUIOrigin(): string {
  // 1. 优先使用运行时配置的环境变量
  const runtimeConfig = useRuntimeConfig()
  const configuredOrigin = runtimeConfig.public.dtpUIOrigin as string
  if (configuredOrigin) {
    return configuredOrigin.replace(/\/+$/, '')
  }

  if (typeof window !== 'undefined' && window.location.hostname) {
    const hostname = window.location.hostname
    // 2. 查 hostname → origin 映射表
    const mappedOrigin = DTP_UI_ORIGIN_MAP[hostname]
    if (mappedOrigin) {
      return mappedOrigin
    }
    // 3. 回退：同源
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
