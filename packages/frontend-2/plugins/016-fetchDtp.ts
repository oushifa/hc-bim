/**
 * Plugin to create a dedicated $fetch instance for DTP API calls
 * with authentication support
 */
export default defineNuxtPlugin(() => {
  const dtpApiOrigin = useDtpApiOrigin()

  const getRequestUrl = (request: RequestInfo | URL) =>
    typeof request === 'string'
      ? request
      : request instanceof URL
      ? request.toString()
      : request.url

  // Guard: if DTP API origin is not configured, skip plugin init to avoid
  // `new URL('')` throwing "Invalid URL" and crashing SSR for the whole app.
  if (!dtpApiOrigin || !dtpApiOrigin.trim()) {
    return {
      provide: {
        dtpFetch: $fetch
      }
    }
  }

  let dtpApiBase: URL | string
  // Support relative origin (e.g., '/__dtp' for proxied requests)
  if (dtpApiOrigin.startsWith('/')) {
    dtpApiBase = dtpApiOrigin
  } else {
    try {
      dtpApiBase = new URL(dtpApiOrigin)
    } catch {
      // eslint-disable-next-line no-console
      console.warn(
        `[fetchDtp] Invalid NUXT_PUBLIC_DTP_API_ORIGIN: "${dtpApiOrigin}", falling back to default $fetch.`
      )
      return {
        provide: {
          dtpFetch: $fetch
        }
      }
    }
  }

  // 缓存的DTP token
  let cachedDtpToken: string | null = null
  let pendingDtpTokenRequest: Promise<string | null> | null = null

  const getDtpToken = async (): Promise<string | null> => {
    if (cachedDtpToken) {
      return cachedDtpToken
    }

    if (import.meta.client) {
      const storedToken = localStorage.getItem('dtp-token')
      if (storedToken) {
        cachedDtpToken = storedToken
        return storedToken
      }
    }

    if (pendingDtpTokenRequest) {
      return pendingDtpTokenRequest
    }

    pendingDtpTokenRequest = (async () => {
      try {
        const mobile = 13000000000

        const CryptoJS = await import('crypto-js')
        const AES_KEY = 'Ze/0w7rnQg7jznntRcuxGQ=='

        const data = JSON.stringify({
          mobile
        })

        const dataParsed = CryptoJS.enc.Utf8.parse(data)
        const keyParsed = CryptoJS.enc.Utf8.parse(AES_KEY)

        const encrypted = CryptoJS.AES.encrypt(dataParsed, keyParsed, {
          mode: CryptoJS.mode.ECB,
          padding: CryptoJS.pad.Pkcs7
        })

        const bimpToken = encrypted.toString()
        const loginUrl = `${dtpApiOrigin}/v1/login/third-party`
        const response = await fetch(loginUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json'
          },
          body: JSON.stringify({
            token: bimpToken
          })
        })

        if (!response.ok) {
          return null
        }

        const responseData = await response.json()
        if (!(responseData.success && responseData.code === 200)) {
          return null
        }

        const dtpToken = responseData.results?.tokens?.[0] as string | undefined
        if (!dtpToken) {
          return null
        }

        cachedDtpToken = dtpToken
        if (import.meta.client) {
          localStorage.setItem('dtp-token', dtpToken)
        }

        return dtpToken
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error getting DTP token:', error)
        return null
      } finally {
        pendingDtpTokenRequest = null
      }
    })()

    try {
      return await pendingDtpTokenRequest
    } finally {
      pendingDtpTokenRequest = null
    }
  }

  // 初始化时获取token
  void getDtpToken()

  // Create a dedicated fetch instance for DTP API
  const dtpFetch = $fetch.create({
    baseURL: dtpApiBase.toString(),
    async onRequest(ctx) {
      const { options } = ctx
      const requestOptions = options as typeof options & {
        originPath?: boolean
      }

      if (requestOptions.originPath) {
        const requestUrl = getRequestUrl(ctx.request)
        const resolvedUrl = requestUrl.startsWith('http')
          ? new URL(requestUrl)
          : new URL(requestUrl, globalThis.location?.origin || 'http://localhost')
        ctx.request = `${resolvedUrl.pathname}${resolvedUrl.search}${resolvedUrl.hash}`
        options.baseURL = new URL(dtpApiBase.toString()).origin
      }

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
    onResponse() {
      // Handle response if needed
    },
    onResponseError({ response }) {
      // Handle error if needed
      // eslint-disable-next-line no-console
      console.error('DTP API Error:', response.status, response.statusText)

      // 如果是401错误，清除缓存并尝试重新获取token
      if (response.status === 401) {
        cachedDtpToken = null
        void getDtpToken()
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
