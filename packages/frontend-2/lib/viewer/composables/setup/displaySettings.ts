import { useSynchronizedCookie } from '~~/lib/common/composables/reactiveCookie'
import { useInjectedViewer } from '~~/lib/viewer/composables/setup'

export type ViewerDisplaySettings = {
  ghostOpacity: number
  hasCustomGhostOpacity: boolean
  backgroundColor: string
  hasCustomBackground: boolean
}

export const useViewerDisplaySettings = () => {
  const localViewerDisplaySettings = useSynchronizedCookie<ViewerDisplaySettings>(
    'viewerDisplaySettings',
    {
      default: () => ({
        ghostOpacity: 0.1,
        hasCustomGhostOpacity: false,
        backgroundColor: '#ffffff',
        hasCustomBackground: false
      })
    }
  )

  const {
    instance,
    init: { promise: initPromise }
  } = useInjectedViewer()

  const isViewerReady = ref(false)

  const ghostOpacity = computed({
    get: () => localViewerDisplaySettings.value.ghostOpacity,
    set: (newValue: number) => {
      localViewerDisplaySettings.value = {
        ...localViewerDisplaySettings.value,
        ghostOpacity: newValue,
        hasCustomGhostOpacity: true
      }
    }
  })

  const backgroundColor = computed({
    get: () => localViewerDisplaySettings.value.backgroundColor,
    set: (newValue: string) => {
      localViewerDisplaySettings.value = {
        ...localViewerDisplaySettings.value,
        backgroundColor: newValue,
        hasCustomBackground: true
      }
    }
  })

  const ghostOpacityPercent = computed(() => `${Math.round(ghostOpacity.value * 100)}%`)

  const hasCustomDisplaySettings = computed(
    () =>
      localViewerDisplaySettings.value.hasCustomGhostOpacity ||
      localViewerDisplaySettings.value.hasCustomBackground
  )

  const hexToNumber = (value: string) => Number.parseInt(value.replace('#', ''), 16)

  const resetGhostOpacity = () => {
    instance.resetGhostOpacity()
    localViewerDisplaySettings.value = {
      ...localViewerDisplaySettings.value,
      ghostOpacity: instance.getGhostOpacity(),
      hasCustomGhostOpacity: false
    }
  }

  const resetBackgroundColor = () => {
    instance.resetBackgroundColor()
    const { color } = instance.getBackgroundColor()
    localViewerDisplaySettings.value = {
      ...localViewerDisplaySettings.value,
      backgroundColor: `#${color.toString(16).padStart(6, '0')}`,
      hasCustomBackground: false
    }
  }

  const resetDisplaySettings = () => {
    resetGhostOpacity()
    resetBackgroundColor()
  }

  watch(
    () =>
      [
        localViewerDisplaySettings.value.ghostOpacity,
        localViewerDisplaySettings.value.hasCustomGhostOpacity
      ] as const,
    ([opacity, hasCustomGhostOpacity]) => {
      if (!isViewerReady.value || !hasCustomGhostOpacity) return
      instance.setGhostOpacity(opacity)
    }
  )

  watch(
    () =>
      [
        localViewerDisplaySettings.value.backgroundColor,
        localViewerDisplaySettings.value.hasCustomBackground
      ] as const,
    ([color, hasCustomBackground]) => {
      if (!isViewerReady.value || !hasCustomBackground) return
      instance.setBackgroundColor(hexToNumber(color), 1)
    }
  )

  onMounted(async () => {
    await initPromise
    isViewerReady.value = true

    if (localViewerDisplaySettings.value.hasCustomGhostOpacity) {
      instance.setGhostOpacity(localViewerDisplaySettings.value.ghostOpacity)
    }

    if (localViewerDisplaySettings.value.hasCustomBackground) {
      instance.setBackgroundColor(
        hexToNumber(localViewerDisplaySettings.value.backgroundColor),
        1
      )
    }
  })

  return {
    ghostOpacity,
    ghostOpacityPercent,
    backgroundColor,
    hasCustomDisplaySettings,
    hasCustomGhostOpacity: computed(() => localViewerDisplaySettings.value.hasCustomGhostOpacity),
    hasCustomBackground: computed(() => localViewerDisplaySettings.value.hasCustomBackground),
    resetGhostOpacity,
    resetBackgroundColor,
    resetDisplaySettings
  }
}
