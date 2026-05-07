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

  // Create a dedicated fetch instance for DTP API
  // TODO: 后续改为从环境变量或动态获取
  const DTP_JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0ZWFtSWQiOiJUZWFtXzQ5NDYwXzFmNGU4MiIsInByb2ZpbGVJZCI6IjAxOWUwMDNlLTNmYjItN2VlNy1iODE5LWM2NjM5YmRjZWI0NiIsIm1hc3RlcklkIjoiNDk0NjAiLCJ3ZHBJZCI6IjQ5NDYwIiwicm9sZXMiOlsiRGV2ZWxvcGVyIl0sIm1vYmlsZSI6IjE3MzM4NDA0NjYwIiwiaW5uZXIiOmZhbHNlLCJlbWFpbCI6bnVsbCwibmFtZSI6IueUqOaIt0VaemVHOGExIiwib2F1dGhTZXNzaW9uSWQiOiIwMTllMDFhMDE0YTk3YmIyYTk2M2ZlODM2ZjQyYTIxMSIsImNsaWVudFR5cGUiOiJXRFA1X0NMT1VEIiwiaWF0IjoxNzc4MTQzNzI4LCJleHAiOjE3NzgyMzAxMjgsImlzcyI6Ind3dy41MWFlcy5jb20iLCJzdWIiOiI1MVdPUkxEIn0.GvJCGK3aaL_K4Fs5MD_0F5TdAJAYJwEfJ43WxeZ6yic'
  
  const dtpFetch = $fetch.create({
    baseURL: dtpApiBase.toString(),
    onRequest({ request, options }) {
      const headers = new Headers(options.headers as HeadersInit | undefined)
      
      // Set Content-Type if not already set
      if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json')
      }
      
      // 使用写死的 JWT token（临时方案）
      if (!headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${DTP_JWT_TOKEN}`)
      }
      
      options.headers = headers
    },
    onResponse({ response }) {
      // Handle response if needed
    },
    onResponseError({ response }) {
      // Handle error if needed
      console.error('DTP API Error:', response.status, response.statusText)
    }
  })

  // Make it available globally as $dtpFetch
  return {
    provide: {
      dtpFetch
    }
  }
})
