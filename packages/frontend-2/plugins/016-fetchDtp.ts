import { useAuthCookie } from '~~/lib/auth/composables/auth'

/**
 * Plugin to create a dedicated $fetch instance for DTP API calls
 * with authentication support
 */
export default defineNuxtPlugin(() => {
  const dtpApiOrigin = useDtpApiOrigin()
  const authToken = useAuthCookie()

  // Guard: if DTP API origin is not configured, skip plugin init to avoid
  // `new URL('')` throwing "Invalid URL" and crashing SSR for the whole app.
  if (!dtpApiOrigin || !dtpApiOrigin.trim()) {
    return {
      provide: {
        dtpFetch: $fetch
      }
    }
  }

  let dtpApiBase: URL
  try {
    dtpApiBase = new URL(dtpApiOrigin)
  } catch {
    console.warn(
      `[fetchDtp] Invalid NUXT_PUBLIC_DTP_API_ORIGIN: "${dtpApiOrigin}", falling back to default $fetch.`
    )
    return {
      provide: {
        dtpFetch: $fetch
      }
    }
  }

  // 缓存的DTP token
  let cachedDtpToken: string | null = null
  let tokenExpiryTime: number = 0

  // 获取DTP token（带缓存）
  const getDtpToken = async (): Promise<string | null> => {
    try {
      // 检查缓存的token是否仍然有效（提前5分钟过期）
      if (cachedDtpToken && Date.now() < tokenExpiryTime - 5 * 60 * 1000) {
        return cachedDtpToken
      }

      // 从localStorage获取DTP token（登录时保存的）
      const storedToken = typeof window !== 'undefined' ? localStorage.getItem('dtp-token') : null
      if (storedToken) {
        cachedDtpToken = storedToken
        tokenExpiryTime = Date.now() + 24 * 60 * 60 * 1000 // 24小时
        return storedToken
      }
      
      return null
    } catch (error) {
      console.error('Error getting DTP token:', error)
      return null
    }
  }

  // 初始化时获取token
  getDtpToken().catch(err => console.error('Failed to initialize DTP token:', err))

  // Create a dedicated fetch instance for DTP API
  const dtpFetch = $fetch.create({
    baseURL: dtpApiBase.toString(),
    async onRequest({ request, options }) {
      const headers = new Headers(options.headers as HeadersInit | undefined)
      
      // Set Content-Type if not already set
      // 但如果 body 是 FormData，不要设置 Content-Type，让浏览器自动设置 multipart/form-data 边界
      if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
        headers.set('Content-Type', 'application/json')
      }
      
      // 每次请求时都尝试获取最新的token
      if (!headers.has('Authorization')) {
        const token = await getDtpToken()
        if (token) {
          headers.set('Authorization', `Bearer ${token}`)
        }
      }
      
      options.headers = headers
    },
    onResponse({ response }) {
      // Handle response if needed
    },
    onResponseError({ response }) {
      // Handle error if needed
      console.error('DTP API Error:', response.status, response.statusText)
      
      // 如果是401错误，清除缓存并尝试重新获取token
      if (response.status === 401) {
        cachedDtpToken = null
        getDtpToken().catch(err => console.error('Failed to refresh DTP token:', err))
      }
    }
  })

  // Make it available globally as $dtpFetch
  return {
    provide: {
      dtpFetch
    }
  }
})
