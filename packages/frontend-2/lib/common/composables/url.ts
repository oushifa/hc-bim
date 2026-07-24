import { reduce } from 'lodash-es'
import type { Nullable, Optional } from '@speckle/shared'
import { writableAsyncComputed } from '~~/lib/common/composables/async'

const RELATIVE_URL_BASE = 'http://speckle-internal.local'
const KNOWN_INTERNAL_PATH_PREFIXES = ['/preview/', '/auth/', '/api/', '/objects/']
const KNOWN_INTERNAL_PATHS = ['/graphql']

const buildRelativeUrl = (url: URL) => `${url.pathname}${url.search}${url.hash}`

const isKnownInternalPath = (pathname: string) =>
  KNOWN_INTERNAL_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix)) ||
  KNOWN_INTERNAL_PATHS.includes(pathname)

const normalizeOrigin = (value?: string) => {
  if (!value?.length) return null

  try {
    return new URL(value).origin
  } catch {
    return null
  }
}

export function serializeHashState(
  state: Record<string, Nullable<string>>
): Optional<string> {
  return !Object.values(state).filter((i) => i !== null).length
    ? undefined
    : `#${Object.entries(state)
        .filter((entry): entry is [string, string] => !!entry[1])
        .map(([key, val]) => `${key}=${val}`)
        .join('&')}`
}

export function deserializeHashState(hashString: string) {
  if (hashString.length < 2 || !hashString.startsWith('#')) return {}

  const keyValuePairs = hashString.substring(1).split('&')
  const result = reduce(
    keyValuePairs,
    (result, item) => {
      const [key, value] = item.split('=')
      if (key && value) {
        result[key] = value
      }
      return result
    },
    {} as Record<string, Nullable<string>>
  )
  return result
}

/**
 * Read/writable state similar to one in the querystring, but one that uses anchor (#) data instead
 */
export function useRouteHashState() {
  const route = useRoute()
  const router = useSafeRouter()

  const hashState = writableAsyncComputed({
    get: () => {
      return deserializeHashState(route.hash)
    },
    set: async (newVal) => {
      const hashString = serializeHashState(newVal)

      await router.push(
        () => ({
          query: route.query,
          hash: hashString
        }),
        {
          skipIf: (to) => {
            return (to.hash || '') === route.hash
          }
        }
      )
    },
    initialState: {},
    asyncRead: false
  })

  return { hashState }
}

export const useAppUrlUtils = () => {
  const {
    public: { baseUrl }
  } = useRuntimeConfig()

  const buildUrl = (relativeUrl: string | URL): string => {
    const url = new URL(relativeUrl, baseUrl)
    return decodeURI(url.toString()) // url encoded looks ugly
  }

  return {
    /**
     * Build full/absolute URL
     */
    buildUrl
  }
}

export const useInternalUrlUtils = () => {
  const {
    public: { apiOrigin, backendApiOrigin }
  } = useRuntimeConfig()

  const internalOrigins = new Set(
    [
      normalizeOrigin(apiOrigin),
      normalizeOrigin(backendApiOrigin),
      import.meta.client ? window.location.origin : null
    ].filter((value): value is string => !!value)
  )

  const toRelativeInternalUrl = (url: Optional<string>) => {
    if (!url?.length || url.startsWith('/') || /^(data|blob):/i.test(url)) return url

    try {
      const parsedUrl = new URL(url)
      return internalOrigins.has(parsedUrl.origin) || isKnownInternalPath(parsedUrl.pathname)
        ? buildRelativeUrl(parsedUrl)
        : url
    } catch {
      return url
    }
  }

  const updateUrlSearchParams = (
    url: string,
    update: (searchParams: URLSearchParams) => void
  ) => {
    const isRelative = url.startsWith('/')
    const parsedUrl = new URL(url, RELATIVE_URL_BASE)
    update(parsedUrl.searchParams)

    if (isRelative || internalOrigins.has(parsedUrl.origin)) {
      return buildRelativeUrl(parsedUrl)
    }

    return parsedUrl.toString()
  }

  const appendUrlPath = (url: string, suffix: string) => {
    const isRelative = url.startsWith('/')
    const parsedUrl = new URL(url, RELATIVE_URL_BASE)
    parsedUrl.pathname = `${parsedUrl.pathname.replace(/\/$/, '')}${suffix}`

    if (isRelative || internalOrigins.has(parsedUrl.origin)) {
      return buildRelativeUrl(parsedUrl)
    }

    return parsedUrl.toString()
  }

  return {
    toRelativeInternalUrl,
    updateUrlSearchParams,
    appendUrlPath
  }
}
