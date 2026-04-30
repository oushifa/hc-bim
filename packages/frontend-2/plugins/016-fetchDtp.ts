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
  const dtpFetch = $fetch.create({
    baseURL: dtpApiBase.toString(),
    onRequest({ request, options }) {
      const headers = new Headers(options.headers as HeadersInit | undefined)
      
      // Set Content-Type if not already set
      if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json')
      }
      
      // Add authentication token if available
      const token = authToken.value || null
      if (token && !headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${token}`)
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
