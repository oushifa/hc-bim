import { useActiveUser } from '~~/lib/auth/composables/activeUser'

let cachedDtpToken: string | null = null
let pendingDtpTokenRequest: Promise<string | null> | null = null
let pendingDtpTokenValidation: Promise<string | null> | null = null
// 清缓存时递增：使清除前发起的在途登录请求作废，避免其回填过期 token
let dtpTokenGeneration = 0

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
  dtpTokenGeneration++
  cachedDtpToken = null
  pendingDtpTokenRequest = null
  if (import.meta.client) {
    localStorage.removeItem('dtp-token')
  }
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
    if (!import.meta.client) {
      return null
    }
    if (cachedDtpToken) {
      return cachedDtpToken
    }

    const storedToken = localStorage.getItem('dtp-token')
    if (storedToken) {
      cachedDtpToken = storedToken
      return storedToken
    }

    if (pendingDtpTokenRequest) {
      return pendingDtpTokenRequest
    }

    // 记录发起时的代次：若期间缓存被清除（探活失败/登出），结果作废不回填
    const generation = dtpTokenGeneration
    const request = (async (): Promise<string | null> => {
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

        // 请求期间缓存被清除过（代次已变）→ 该 token 已过时，丢弃不回填
        if (generation !== dtpTokenGeneration) {
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
      }
    })()

    pendingDtpTokenRequest = request
    // 仅当引用仍指向本次请求时才清除，避免误清后续新发起请求的去重引用
    void request.finally(() => {
      if (pendingDtpTokenRequest === request) {
        pendingDtpTokenRequest = null
      }
    })

    return request
  }

  // 仅在客户端预取 token，避免服务端对相对 DTP 地址发起无效请求。
  if (import.meta.client) {
    void getDtpToken()
  }

  /**
   * 判断响应体业务码是否为 401（token 过期，契约：成功 code=200，token 过期 code=401）
   */
  const isBodyCode401 = (data: unknown): boolean => {
    if (!data || typeof data !== 'object') return false
    return (data as { code?: unknown }).code === 401
  }

  /**
   * 判断错误是否为 HTTP 401
   */
  const isHttp401Error = (err: unknown): boolean => {
    if (!err || typeof err !== 'object') return false
    const response = (err as { response?: { status?: number } }).response
    return response?.status === 401
  }

  /**
   * 校验当前 token 在 DTP 服务端是否仍然有效；失效则清除缓存并重新走第三方登录获取。
   * 解决 localStorage 中 token 已被服务端作废（此前需退出重登才能恢复）的问题。
   * 并发调用共享同一次「探活 + 刷新」流程，避免探活失败时多路并发各自清缓存、
   * 重复触发第三方登录导致 token 互相覆盖。
   */
  const ensureValidDtpToken = async (): Promise<string | null> => {
    if (pendingDtpTokenValidation) {
      return pendingDtpTokenValidation
    }

    const validation = (async (): Promise<string | null> => {
      const token = await getDtpToken()
      if (!token) return null

      try {
        // 用轻量接口探活，验证 token 是否仍被 DTP 服务端认可
        const response = await fetch(
          `${getDtpBaseURL()}/v1/team/workingTeam/info`,
          {
            method: 'GET',
            headers: {
              Accept: 'application/json',
              Authorization: `Bearer ${token}`
            }
          }
        )

        if (response.status === 401 || response.status === 403) {
          // token 已失效 → 清除并强制重新登录获取
          clearDtpTokenCache()
          return getDtpToken()
        }

        if (response.ok) {
          const data = (await response.json().catch(() => null)) as {
            success?: boolean
          } | null
          // HTTP 200 但业务层判定未认证（部分 DTP 接口以 success:false 或业务码 401 表达）
          if (data && (data.success === false || isBodyCode401(data))) {
            clearDtpTokenCache()
            return getDtpToken()
          }
        }

        // 其余情况（探活成功或服务端异常）不判失效，沿用现有 token
        return token
      } catch {
        // 网络异常时不视为 token 失效，避免误清可用 token
        return token
      }
    })()

    pendingDtpTokenValidation = validation
    void validation.finally(() => {
      if (pendingDtpTokenValidation === validation) {
        pendingDtpTokenValidation = null
      }
    })

    return validation
  }

  // Create a dedicated fetch instance for DTP API
  const baseFetch = $fetch.create({
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

  /**
   * 统一处理 DTP 接口 token 过期（响应体业务码 code === 401 或 HTTP 401）：
   * 清除 token 缓存 → 重新调用登录接口获取新 token → 重试原请求一次，
   * 使孪生模型等模块在 token 过期时自动恢复，无需用户手动重新登录。
   */
  const dtpFetch = async <T = unknown>(
    request: Parameters<typeof baseFetch>[0],
    options?: Parameters<typeof baseFetch>[1] & DtpFetchOptions
  ): Promise<T> => {
    let retried = false

    const execute = async (): Promise<T> => {
      // 每次执行使用独立副本，避免 onRequest 删除 prefix/originPath 后影响重试的 URL 解析
      const callOptions = options ? { ...options } : undefined
      try {
        const response = await baseFetch.raw<T>(request, callOptions)
        return response._data as T
      } catch (err) {
        // HTTP 401：token 已失效（onResponseError 已清缓存），重新登录后重试一次
        if (!retried && isHttp401Error(err)) {
          retried = true
          const newToken = await getDtpToken()
          if (newToken) {
            return execute()
          }
        }
        throw err
      }
    }

    const data = await execute()

    // 响应体业务码 401：token 过期 → 重新调用登录接口获取新 token 后重试一次
    if (!retried && isBodyCode401(data)) {
      retried = true
      clearDtpTokenCache()
      const newToken = await getDtpToken()
      if (newToken) {
        return execute()
      }
    }

    return data
  }

  // Make it available globally as $dtpFetch / $getDtpToken / $ensureValidDtpToken
  return {
    provide: {
      dtpFetch,
      getDtpToken,
      ensureValidDtpToken
    }
  }
})
