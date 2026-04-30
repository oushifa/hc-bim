import { useAuthCookie } from '~~/lib/auth/composables/auth'

/**
 * Plugin to create a dedicated $fetch instance for DTP API calls
 * with authentication support
 */
export default defineNuxtPlugin(() => {
  const dtpApiOrigin = useDtpApiOrigin()
  const dtpApiBase = new URL(dtpApiOrigin)
  const authToken = useAuthCookie()

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
