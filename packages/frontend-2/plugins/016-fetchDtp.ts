import { useActiveUser } from '~~/lib/auth/composables/activeUser'

let cachedDtpToken: string | null = null
let pendingDtpTokenRequest: Promise<string | null> | null = null

type DtpFetchOptions = {
  originPath?: boolean
  prefix?: string
}

const DEFAULT_DTP_PREFIX = '/__dtp'
const FALLBACK_ORIGIN = 'http://localhost'

const trimTrailingSlashes = (value: string) => value.replace(/\/+$/, '')
const ensureLeadingSlash = (value: string) =>
  value.startsWith('/') ? value : `/${value}`

const joinUrlPath = (base: string, path: string) => {
  const normalizedBase = trimTrailingSlashes(base)
  const normalizedPath = ensureLeadingSlash(path)
  return `${normalizedBase}${normalizedPath}`
}

export const clearDtpTokenCache = () => {
  cachedDtpToken = null
  pendingDtpTokenRequest = null
}

/**
 * Plugin to create a dedicated $fetch instance for DTP API calls
 * with authentication support
 */
export default defineNuxtPlugin(() => {
  const { activeUser } = useActiveUser()
  const dtpApiOrigin = useDtpApiOrigin()?.trim() || DEFAULT_DTP_PREFIX

  const getCurrentOrigin = () => globalThis.location?.origin || FALLBACK_ORIGIN

  const getRequestUrl = (request: RequestInfo | URL) =>
    typeof request === 'string'
      ? request
      : request instanceof URL
      ? request.toString()
      : request.url

  const getResolvedRequestUrl = (request: RequestInfo | URL) =>
    new URL(getRequestUrl(request), getCurrentOrigin())

  const getDtpBaseOrigin = () => {
    if (dtpApiOrigin.startsWith('http://') || dtpApiOrigin.startsWith('https://')) {
      return new URL(dtpApiOrigin).origin
    }

    return getCurrentOrigin()
  }

  const getDtpBaseURL = () => {
    if (dtpApiOrigin.startsWith('http://') || dtpApiOrigin.startsWith('https://')) {
      return trimTrailingSlashes(dtpApiOrigin)
    }

    return trimTrailingSlashes(dtpApiOrigin) || DEFAULT_DTP_PREFIX
  }

  const resolvePrefixedRequest = (request: RequestInfo | URL, prefix: string) => {
    const resolvedUrl = getResolvedRequestUrl(request)
    const requestPath = `${resolvedUrl.pathname}${resolvedUrl.search}${resolvedUrl.hash}`
    const normalizedPrefix = prefix.trim()

    if (
      normalizedPrefix.startsWith('http://') ||
      normalizedPrefix.startsWith('https://')
    ) {
      const prefixUrl = new URL(normalizedPrefix)
      return {
        baseURL: prefixUrl.origin,
        request: joinUrlPath(prefixUrl.pathname || '/', requestPath)
      }
    }

    return {
      baseURL: getCurrentOrigin(),
      request: joinUrlPath(ensureLeadingSlash(normalizedPrefix), requestPath)
    }
  }

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
        const mobile = activeUser.value?.email?.trim()
        if (!mobile) {
          return null
        }

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
        const loginUrl = `${getDtpBaseURL()}/v1/login/third-party`
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

  // 仅在客户端预取 token，避免服务端对相对 DTP 地址发起无效请求。
  if (import.meta.client) {
    void getDtpToken()
  }

  // Create a dedicated fetch instance for DTP API
  const dtpFetch = $fetch.create({
    baseURL: getDtpBaseURL(),
    async onRequest(ctx) {
      const { options } = ctx
      const requestOptions = options as typeof options & DtpFetchOptions

      if (requestOptions.prefix?.trim()) {
        const resolvedRequest = resolvePrefixedRequest(
          ctx.request,
          requestOptions.prefix
        )
        ctx.request = resolvedRequest.request
        options.baseURL = resolvedRequest.baseURL
      } else if (requestOptions.originPath) {
        const resolvedUrl = getResolvedRequestUrl(ctx.request)
        ctx.request = `${resolvedUrl.pathname}${resolvedUrl.search}${resolvedUrl.hash}`
        options.baseURL = getDtpBaseOrigin()
      } else {
        const resolvedUrl = getResolvedRequestUrl(ctx.request)
        const requestPath = `${resolvedUrl.pathname}${resolvedUrl.search}${resolvedUrl.hash}`
        const normalizedBaseURL = getDtpBaseURL()
        const basePath = normalizedBaseURL.startsWith('http')
          ? new URL(normalizedBaseURL).pathname
          : normalizedBaseURL

        if (basePath && basePath !== '/') {
          ctx.request = joinUrlPath(basePath, requestPath)
          options.baseURL = getDtpBaseOrigin()
        } else {
          ctx.request = requestPath
        }
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
      delete requestOptions.originPath
      delete requestOptions.prefix
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
        clearDtpTokenCache()
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
