import { useAuthCookie } from '~~/lib/auth/composables/auth'

export default defineNuxtPlugin(() => {
  const apiBase = new URL(useApiOrigin({ absolute: true }))
  const frontendOrigin = useFrontendOrigin()
  const authToken = useAuthCookie()

  const authFetch = $fetch.create({
    onRequest({ request, options }) {
      const requestUrl =
        typeof request === 'string'
          ? request
          : request instanceof URL
          ? request.toString()
          : request.url
      const resolvedUrl = new URL(requestUrl, apiBase)
      if (resolvedUrl.origin !== apiBase.origin) return

      const headers = new Headers(options.headers as HeadersInit | undefined)
      if (!headers.has('X-Frontend-Origin')) {
        headers.set('X-Frontend-Origin', frontendOrigin)
      }
      const token = authToken.value || null
      if (!headers.has('Authorization')) {
        if (!token) {
          options.headers = headers
          return
        }
        headers.set('Authorization', `Bearer ${token}`)
      }
      options.headers = headers
    }
  })

  globalThis.$fetch = authFetch
})
