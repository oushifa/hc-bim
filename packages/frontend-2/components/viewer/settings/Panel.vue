<template>
  <ViewerLayoutSidePanel title="显示设置">
    <div class="flex flex-col gap-4 p-4">
      <div class="flex flex-col gap-2">
        <div class="flex items-center justify-between">
          <span class="text-body-2xs text-foreground">非隔离对象透明度</span>
          <button
            class="text-body-2xs text-foreground-2 transition hover:text-foreground"
            type="button"
            @click="resetGhostOpacity"
          >
            恢复默认
          </button>
        </div>
        <FormRange
          v-model="ghostOpacity"
          name="ghostOpacity"
          :min="0"
          :max="1"
          :step="0.05"
          label="透明度"
        />
        <span class="text-body-2xs text-foreground-2">
          当前值：{{ ghostOpacityPercent }}
        </span>
      </div>

      <div class="h-px bg-outline-3" />

      <div class="flex flex-col gap-2">
        <div class="flex items-center justify-between">
          <span class="text-body-2xs text-foreground">背景颜色</span>
          <button
            class="text-body-2xs text-foreground-2 transition hover:text-foreground"
            type="button"
            @click="resetBackgroundColor"
          >
            恢复默认
          </button>
        </div>
        <div class="flex items-center gap-3">
          <label class="flex items-center" for="viewer-background-color">
            <span class="sr-only">背景颜色选择器</span>
            <input
              id="viewer-background-color"
              v-model="backgroundColor"
              class="h-9 w-12 cursor-pointer rounded border border-outline-3 bg-foundation p-1"
              type="color"
            />
          </label>
          <div class="flex min-w-0 flex-1 items-center justify-between rounded border border-outline-3 px-3 py-2">
            <span class="text-body-2xs text-foreground-2">HEX</span>
            <span class="truncate font-mono text-body-2xs text-foreground">
              {{ backgroundColor.toUpperCase() }}
            </span>
          </div>
        </div>
        <span class="text-body-2xs text-foreground-2">
          修改后立即生效，恢复默认会回到默认透明背景。
        </span>
      </div>
    </div>
  </ViewerLayoutSidePanel>
</template>

<script setup lang="ts">
import { FormRange } from '@speckle/ui-components'
import { useSynchronizedCookie } from '~~/lib/common/composables/reactiveCookie'
import { useInjectedViewer } from '~~/lib/viewer/composables/setup'

type ViewerDisplaySettings = {
  ghostOpacity: number
  hasCustomGhostOpacity: boolean
  backgroundColor: string
  hasCustomBackground: boolean
}

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
</script>
