import type { FeatureFlags } from '@speckle/shared/environment/featureFlags'

const normalizeOrigin = (value?: string) => {
  if (!value?.length) return null

  try {
    return new URL(value).origin
  } catch {
    return null
  }
}

/**
 * IMPORTANT: Don't use this directly in Vue templates that may render in SSR, cause this may cause the backend API origin to be rendered instead of the clientside one,
 * at least until the app finishes hydrating. If people click on links based on this too early, they may end up in the wrong place.
 */
export const useApiOrigin = (
  options?: Partial<{
    forcePublic: boolean
    absolute: boolean
  }>
) => {
  const {
    public: { apiOrigin, backendApiOrigin }
  } = useRuntimeConfig()

  const serverOrigin =
    backendApiOrigin.length > 1 && !options?.forcePublic ? backendApiOrigin : apiOrigin
  const configuredPublicOrigin = normalizeOrigin(apiOrigin)

  if (options?.absolute) {
    if (import.meta.client) return configuredPublicOrigin || window.location.origin
    if (serverOrigin.length) return serverOrigin
    return useRequestURL().origin
  }

  if (import.meta.server) {
    return serverOrigin
  }

  if (configuredPublicOrigin && configuredPublicOrigin !== window.location.origin) {
    return configuredPublicOrigin
  }

  return ''
}

export const useFrontendOrigin = () => {
  if (import.meta.client) return window.location.origin

  return useRequestURL().origin
}

export const useFeatureFlags = (): FeatureFlags => {
  const { public: featureFlags } = useRuntimeConfig()
  return featureFlags
}

/**
 * Get the DTP API origin for external API calls
 */
export const useDtpApiOrigin = () => {
  const {
    public: { dtpApiOrigin }
  } = useRuntimeConfig()

  return dtpApiOrigin
}
