import type { MaybeRef } from '@vueuse/core'
import type { Nullable } from '@speckle/shared'
import { onProjectVersionsPreviewGeneratedSubscription } from '~~/lib/projects/graphql/subscriptions'
import { useSubscription } from '@vue/apollo-composable'
import { useLock } from '~~/lib/common/composables/singleton'
import PreviewPlaceholder from '~~/assets/images/preview_placeholder.png'
import { isValidBase64Image } from '@speckle/shared/images/base64'
import { nanoid } from 'nanoid'
import { useInternalUrlUtils } from '~~/lib/common/composables/url'

/**
 * Eager loading previews ensures a better LCP score, but also hits the preview endpoint more often.
 * Since we don't know the viewport size in SSR, we can just set a limit of how many previews to eager
 * load after which they should use spinners.
 *
 * Theoretically even 1 eager load will fix the LCP issue, but it will look odd if all of the other ones
 * show up as spinners. So ideally just set enough for 1 page load.
 *
 * Assuming a large screen w/ the busiest preview page (project page w/ model grid), there would be
 * about 20 previews
 */
const PREVIEWS_EAGER_LOAD_COUNT = 20

const previewUrlProjectIdRegexp = /\/preview\/([\w\d]+)\//i
const previewUrlCommitIdRegexp = /\/commits\/([\w\d]+)/i
const previewUrlObjectIdRegexp = /\/objects\/([\w\d]+)/i

class AngleNotFoundError extends Error {}

type PreviewFetchMetadata = {
  status: Nullable<string>
  errorCode: Nullable<string>
  error: Nullable<string>
}

const usePreviewsState = () =>
  useState('preview_images_load_state', () => ({
    /**
     * How many previews have already been eager loaded
     */
    eagerLoadedKeys: new Set<string>()
  }))

/**
 * Get authenticated preview image URL and subscribes to preview image generation events so that the preview image URL
 * is updated whenever generation finishes
 *
 * TODO: Refactor, the internals have gotten very messy and overly complicated
 */
export function usePreviewImageBlob(
  previewUrl: MaybeRef<string | null | undefined>,
  options?: Partial<{
    /**
     * Allows disabling the mechanism conditionally (e.g. if image not in viewport)
     */
    enabled: MaybeRef<boolean>
    /**
     * Whether to avoid spinners and just embed the image immediately. Means we will likely
     * load a lot more than needed, but also get a way better LCP score (no spinners).
     *
     * If enabled, overrides `enabled` to be true.
     */
    eagerLoad: boolean
  }>
) {
  // Checking if we're allowed to eager load
  const { $isAppHydrated } = useNuxtApp()
  const state = usePreviewsState()
  const eagerLoadKey = unref(previewUrl) || nanoid()
  const eagerLoad =
    options?.eagerLoad &&
    !$isAppHydrated.value &&
    (state.value.eagerLoadedKeys.size < PREVIEWS_EAGER_LOAD_COUNT ||
      state.value.eagerLoadedKeys.has(eagerLoadKey))

  if (eagerLoad) {
    state.value.eagerLoadedKeys.add(eagerLoadKey)
  }

  // Continue on with normal operation
  const { enabled = ref(true) } = options || {}
  const logger = useLogger() as {
    error: (...args: unknown[]) => void
    warn: (...args: unknown[]) => void
  }
  const lazyLoad = !eagerLoad
  const { toRelativeInternalUrl, updateUrlSearchParams, appendUrlPath } =
    useInternalUrlUtils()

  const url = ref<Nullable<string>>(PreviewPlaceholder)
  const hasDoneFirstLoad = ref(false)
  const panoramaUrl = ref(null as Nullable<string>)
  const isLoadingPanorama = ref(false)
  const shouldLoadPanorama = ref(false)
  const previewStatus = ref<Nullable<string>>(null)
  const previewErrorCode = ref<Nullable<string>>(null)
  const previewError = ref<Nullable<string>>(null)
  const panoramaPreviewStatus = ref<Nullable<string>>(null)
  const panoramaPreviewErrorCode = ref<Nullable<string>>(null)
  const panoramaPreviewError = ref<Nullable<string>>(null)
  const currentPreviewBlobUrl = ref<Nullable<string>>(null)
  const currentPanoramaBlobUrl = ref<Nullable<string>>(null)
  const normalizedPreviewUrl = computed(() => {
    const rawPreviewUrl = unref(previewUrl)
    if (!rawPreviewUrl || isValidBase64Image(rawPreviewUrl)) return rawPreviewUrl
    return toRelativeInternalUrl(rawPreviewUrl)
  })
  const basePanoramaUrl = computed(() => {
    const normalizedUrl = normalizedPreviewUrl.value
    if (!normalizedUrl || isValidBase64Image(normalizedUrl)) return normalizedUrl
    return appendUrlPath(normalizedUrl, '/all')
  })
  const isEnabled = computed(() => {
    if (import.meta.server) return true // always true on server
    return unref(enabled)
  })
  const cacheBust = ref(0)
  const isPanoramaPlaceholder = ref(false)

  const ret = {
    previewUrl: computed(() => url.value),
    panoramaPreviewUrl: computed(() => panoramaUrl.value),
    isLoadingPanorama,
    shouldLoadPanorama,
    hasDoneFirstLoad: computed(() => hasDoneFirstLoad.value),
    isPanoramaPlaceholder: computed(() => isPanoramaPlaceholder.value),
    previewStatus: computed(() => previewStatus.value),
    previewErrorCode: computed(() => previewErrorCode.value),
    previewError: computed(() => previewError.value),
    panoramaPreviewStatus: computed(() => panoramaPreviewStatus.value),
    panoramaPreviewErrorCode: computed(() => panoramaPreviewErrorCode.value),
    panoramaPreviewError: computed(() => panoramaPreviewError.value),
    wasEagerLoaded: eagerLoad
  }

  const previewUrlPath = computed(() => {
    const basePreviewUrl = normalizedPreviewUrl.value
    if (!basePreviewUrl) return null

    const urlObj = new URL(basePreviewUrl, 'http://speckle-internal.local')
    return urlObj.pathname
  })

  const projectId = computed(() => {
    const path = previewUrlPath.value
    if (!path) return null
    const [, val] = previewUrlProjectIdRegexp.exec(path) || [null, null]
    return val
  })

  const versionId = computed(() => {
    const path = previewUrlPath.value
    if (!path) return null
    const [, val] = previewUrlCommitIdRegexp.exec(path) || [null, null]
    return val
  })

  const objectId = computed(() => {
    const path = previewUrlPath.value
    if (!path) return null
    const [, val] = previewUrlObjectIdRegexp.exec(path) || [null, null]
    return val
  })

  const isPreviewServiceUrl = computed(() => !!projectId.value)

  const { hasLock } = useLock(
    computed(() => `useProjectModelUpdateTracking-${unref(previewUrl) || ''}`)
  )
  const { onResult: onProjectPreviewGenerated } = useSubscription(
    onProjectVersionsPreviewGeneratedSubscription,
    () => ({
      id: projectId.value || ''
    }),
    () => ({
      enabled:
        !!projectId.value && hasLock.value && isEnabled.value && !import.meta.server,
      errorPolicy: 'all'
    })
  )

  onProjectPreviewGenerated((res) => {
    const message = res.data?.projectVersionsPreviewGenerated
    if (!message) return

    let regenerate = false
    if (objectId.value && objectId.value === message.objectId) {
      regenerate = true
    } else if (versionId.value && versionId.value === message.versionId) {
      regenerate = true
    }

    if (regenerate) {
      void regeneratePreviews()
    }
  })

  const updatePreviewMetadata = (
    target: 'main' | 'panorama',
    metadata?: Partial<PreviewFetchMetadata>
  ) => {
    const statusRef = target === 'main' ? previewStatus : panoramaPreviewStatus
    const errorCodeRef = target === 'main' ? previewErrorCode : panoramaPreviewErrorCode
    const errorRef = target === 'main' ? previewError : panoramaPreviewError

    statusRef.value = metadata?.status || null
    errorCodeRef.value = metadata?.errorCode || null
    errorRef.value = metadata?.error || null
  }

  const revokeBlobUrl = (target: 'main' | 'panorama') => {
    const targetRef = target === 'main' ? currentPreviewBlobUrl : currentPanoramaBlobUrl
    if (!targetRef.value) return

    URL.revokeObjectURL(targetRef.value)
    targetRef.value = null
  }

  const setResolvedUrl = (target: 'main' | 'panorama', nextUrl: Nullable<string>) => {
    revokeBlobUrl(target)

    if (target === 'main') {
      url.value = nextUrl
      currentPreviewBlobUrl.value = nextUrl?.startsWith('blob:') ? nextUrl : null
      return
    }

    panoramaUrl.value = nextUrl
    currentPanoramaBlobUrl.value = nextUrl?.startsWith('blob:') ? nextUrl : null
  }

  const maybeLogPreviewMetadata = (
    target: 'main' | 'panorama',
    requestUrl: string,
    metadata: PreviewFetchMetadata
  ) => {
    if (!metadata.status && !metadata.errorCode && !metadata.error) return
    if (metadata.status === 'done' && !metadata.errorCode && !metadata.error) return

    logger.warn('[Preview image] Preview response metadata', {
      target,
      requestUrl,
      previewStatus: metadata.status,
      previewErrorCode: metadata.errorCode,
      previewError: metadata.error
    })
  }

  const loadImageDimensions = async (blobUrl: string) => {
    const img = new Image()
    img.src = blobUrl
    await new Promise((resolve, reject) => {
      img.onload = resolve
      img.onerror = reject
    })

    return {
      naturalWidth: img.naturalWidth
    }
  }

  const fetchPreviewImage = async (
    requestUrl: string,
    target: 'main' | 'panorama',
    options?: {
      measureImage?: boolean
      throwOnAngleNotFound?: boolean
    }
  ) => {
    const response = await fetch(requestUrl, {
      credentials: 'include'
    })

    const metadata: PreviewFetchMetadata = {
      status: response.headers.get('X-Preview-Status'),
      errorCode: response.headers.get('X-Preview-Error-Code'),
      error: response.headers.get('X-Preview-Error')
    }

    updatePreviewMetadata(target, metadata)

    if (!response.ok) {
      return null
    }

    maybeLogPreviewMetadata(target, requestUrl, metadata)

    if (options?.throwOnAngleNotFound && metadata.errorCode === 'ANGLE_NOT_FOUND') {
      throw new AngleNotFoundError(metadata.error || 'Preview angle not found')
    }

    const blob = await response.blob()
    const blobUrl = URL.createObjectURL(blob)

    try {
      const dimensions = options?.measureImage
        ? await loadImageDimensions(blobUrl)
        : undefined

      return {
        blobUrl,
        ...metadata,
        ...dimensions
      }
    } catch (e) {
      URL.revokeObjectURL(blobUrl)
      throw e
    }
  }

  async function processBasePreviewUrl() {
    if (!isEnabled.value) return

    const basePreviewUrl = normalizedPreviewUrl.value
    try {
      if (!basePreviewUrl) {
        updatePreviewMetadata('main')
        setResolvedUrl('main', PreviewPlaceholder)
        hasDoneFirstLoad.value = true
        return
      }

      if (isValidBase64Image(basePreviewUrl)) {
        // return as is
        updatePreviewMetadata('main')
        setResolvedUrl('main', basePreviewUrl)
        hasDoneFirstLoad.value = true
        return
      }

      const requestUrl = updateUrlSearchParams(basePreviewUrl, (searchParams) => {
        searchParams.set('v', cacheBust.value.toString())
      })

      if (import.meta.server) {
        updatePreviewMetadata('main')
        setResolvedUrl('main', requestUrl)
        return
      }

      const previewImage = await fetchPreviewImage(requestUrl, 'main', {
        measureImage: lazyLoad
      })
      setResolvedUrl('main', previewImage?.blobUrl || PreviewPlaceholder)
    } catch (e) {
      logger.error('Preview image load error', e)
      updatePreviewMetadata('main')
      setResolvedUrl('main', PreviewPlaceholder)
    } finally {
      hasDoneFirstLoad.value = true
    }
  }

  async function processPanoramaPreviewUrl() {
    if (!isEnabled.value || import.meta.server) return

    const basePreviewUrl = normalizedPreviewUrl.value
    try {
      isLoadingPanorama.value = true
      if (!basePreviewUrl) {
        updatePreviewMetadata('panorama')
        setResolvedUrl('panorama', null)
        return
      }

      if (isValidBase64Image(basePreviewUrl)) {
        updatePreviewMetadata('panorama')
        setResolvedUrl('panorama', null) // panorama unsupported
        return
      }

      const panoramaBaseUrl = basePanoramaUrl.value
      if (!panoramaBaseUrl) {
        updatePreviewMetadata('panorama')
        setResolvedUrl('panorama', null)
        return
      }

      const requestUrl = updateUrlSearchParams(panoramaBaseUrl, (searchParams) => {
        searchParams.set('v', cacheBust.value.toString())
      })

      const previewImage = await fetchPreviewImage(requestUrl, 'panorama', {
        measureImage: true,
        throwOnAngleNotFound: true
      })

      if (!previewImage) {
        setResolvedUrl('panorama', null)
        return
      }

      // If width is 700px or less, it's the placeholder not the actual panorama
      isPanoramaPlaceholder.value = (previewImage.naturalWidth || 0) <= 700
      setResolvedUrl('panorama', previewImage.blobUrl)
    } catch (e) {
      if (!(e instanceof AngleNotFoundError)) {
        logger.error('Panorama preview image load error:', e)
      }

      updatePreviewMetadata('panorama')
      setResolvedUrl('panorama', null)
    } finally {
      isLoadingPanorama.value = false
    }
  }

  const regeneratePreviews = async () => {
    cacheBust.value++
    await Promise.all([
      processBasePreviewUrl(),
      ...(shouldLoadPanorama.value ? [processPanoramaPreviewUrl()] : [])
    ])
  }

  if (import.meta.client) {
    watch(shouldLoadPanorama, (newVal) => {
      if (newVal) processPanoramaPreviewUrl()
    })

    watch(
      () => unref(previewUrl),
      () => {
        void regeneratePreviews()
      }
    )

    watch(
      () => isEnabled.value,
      (newVal) => {
        if (!newVal) return

        void regeneratePreviews()
      }
    )
  } else {
    useHead({
      link: computed(() => [
        ...(url.value?.length && isPreviewServiceUrl.value
          ? [{ rel: 'preload', as: <const>'image', href: url.value }]
          : [])
      ])
    })
  }

  const init = () => {
    if (!eagerLoad && import.meta.server) {
      return // don't do anything - show spinner
    }

    void regeneratePreviews()
  }
  init()

  onScopeDispose(() => {
    revokeBlobUrl('main')
    revokeBlobUrl('panorama')
  })

  return ret
}

export function useCommentScreenshotImage(
  screenshotData: MaybeRef<string | null | undefined>
) {
  const backgroundImage = computed(() => {
    const screenshot = unref(screenshotData) || 'data:null'
    return `url("${screenshot}")`
  })

  return { backgroundImage, screenshot: unref(screenshotData) }
}
