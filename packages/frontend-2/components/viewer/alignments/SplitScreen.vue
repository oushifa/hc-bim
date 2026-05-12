<template>
  <!-- 
    SplitScreen overlay.
    When active, this fixed div covers the entire viewport.
    The CAD viewer fills the left pane.
    The existing Speckle `#viewer` element is constrained to the right pane
    via a CSS variable we inject into :root.
  -->
  <!-- eslint-disable vuejs-accessibility/no-static-element-interactions -->
  <div
    ref="containerEl"
    class="split-screen-root fixed inset-0 flex overflow-hidden pointer-events-none"
    style="z-index: 20"
  >
    <!-- ===== LEFT: CAD Viewer ===== -->
    <div
      class="cad-pane relative flex-shrink-0 h-full overflow-hidden pointer-events-auto"
      :style="{ width: leftWidthPercent + '%' }"
    >
      <ViewerAlignmentsCadViewer
        ref="cadViewerRef"
        :camera-sync="cameraSyncEnabled"
        :calibrate-mode="
          alignState.calibration.active && alignState.calibration.step === 'cad'
        "
        @controls-ready="onCadControlsReady"
        @controls-change="onCadChange"
        @calibrate-pick="onCadCalibratePick"
      />
    </div>

    <!-- ===== DIVIDER ===== -->
    <div
      class="divider relative flex-shrink-0 h-full overflow-visible cursor-col-resize select-none z-30 group pointer-events-auto"
      style="width: 6px"
      @mousedown.prevent="startDrag"
    >
      <div
        class="absolute inset-0 transition-colors duration-150 group-hover:bg-primary"
        :class="isDragging ? 'bg-primary' : 'bg-outline-2'"
      />
      <!-- Grip dots -->
      <div
        class="absolute inset-y-0 inset-x-0 flex flex-col items-center justify-center gap-1 pointer-events-none"
      >
        <div
          v-for="i in 5"
          :key="i"
          class="w-1 h-1 rounded-full transition-colors pointer-events-none"
          :class="isDragging ? 'bg-white' : 'bg-outline-3 group-hover:bg-white'"
        />
      </div>
      <!-- Ratio tooltip while dragging -->
      <Transition name="fade">
        <div
          v-if="isDragging"
          class="absolute top-1/2 left-3 -translate-y-1/2 bg-foundation border border-outline-2 rounded px-2 py-0.5 text-body-xs text-foreground whitespace-nowrap shadow-md pointer-events-none"
        >
          {{ Math.round(leftWidthPercent) }}% /
          {{ Math.round(100 - leftWidthPercent) }}%
        </div>
      </Transition>
    </div>

    <!-- ===== RIGHT: transparent placeholder (real viewer is positioned via CSS) ===== -->
    <div
      class="speckle-pane relative flex-1 h-full overflow-hidden pointer-events-none"
    >
      <!-- Camera sync badge -->
      <Transition name="slide-down">
        <div
          v-if="cameraSyncEnabled"
          class="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1 rounded-full text-body-xs font-medium bg-primary/20 border border-primary/50 text-primary backdrop-blur-sm z-20 pointer-events-none"
        >
          <Link2 class="w-3.5 h-3.5" />
          相机已联动
        </div>
      </Transition>

      <Transition name="slide-down">
        <div
          v-if="alignState.calibration.active"
          class="absolute top-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-body-xs font-medium bg-amber-500/15 border border-amber-500/40 text-amber-400 backdrop-blur-sm z-20 pointer-events-none"
        >
          <Crosshair class="w-3.5 h-3.5" />
          {{
            alignState.calibration.step === 'cad'
              ? '请先点击左侧 CAD 特征点'
              : '请点击右侧 Speckle 对应点'
          }}
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Link2, Crosshair } from 'lucide-vue-next'
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { Vector2, Vector3 } from 'three'
import { useCameraSync } from './CameraSync'
import type { CadViewerBridge } from './CameraSync'
import type { CoordinateOffset } from './CoordinateOffset'
import { calcOffsetFromPoints } from './CoordinateOffset'
import { useInjectedViewerState } from '~~/lib/viewer/composables/setup'
import { useAlignmentState } from '~/lib/viewer/composables/setup/alignment'

// --------------------------------------------------------------------------
// Props / emits
// --------------------------------------------------------------------------
interface Props {
  splitRatio?: number
  offset?: CoordinateOffset
  cameraSyncEnabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  splitRatio: 0.5,
  offset: () => ({ dx: 0, dy: 0, dz: 0, scale: 1 }),
  cameraSyncEnabled: false
})

const {
  state: alignState,
  setOffset,
  cancelCalibration,
  setCalibrationCadPoint,
  setCalibrationSpecklePoint
} = useAlignmentState()

const {
  viewer: { instance: speckleInstance, container: speckleContainer }
} = useInjectedViewerState()

const emit = defineEmits<{
  (e: 'update:splitRatio', v: number): void
}>()

const containerEl = useTemplateRef<HTMLDivElement>('containerEl')
const cadViewerRef = useTemplateRef<CadViewerBridge>('cadViewerRef')

// --------------------------------------------------------------------------
// Split ratio / dragging
// --------------------------------------------------------------------------
const leftWidthPercent = ref(props.splitRatio * 100)
const isDragging = ref(false)

let dragStartX = 0
let dragStartLeft = 0

const startDrag = (e: MouseEvent) => {
  isDragging.value = true
  dragStartX = e.clientX
  dragStartLeft = leftWidthPercent.value

  const onMove = (ev: MouseEvent) => {
    if (!containerEl.value) return
    const totalW = containerEl.value.clientWidth
    const delta = ev.clientX - dragStartX
    const deltaPercent = (delta / totalW) * 100
    const newLeft = Math.min(80, Math.max(20, dragStartLeft + deltaPercent))
    leftWidthPercent.value = newLeft
    applyViewerClip(newLeft)
    emit('update:splitRatio', newLeft / 100)
  }

  const onUp = () => {
    isDragging.value = false
    document.body.style.cursor = ''
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
  }

  document.body.style.cursor = 'col-resize'
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}

// Watch prop changes
watch(
  () => props.splitRatio,
  (v) => {
    leftWidthPercent.value = v * 100
    applyViewerClip(v * 100)
  }
)

// --------------------------------------------------------------------------
// CSS injection: clip/offset the existing Speckle #viewer DOM element
// --------------------------------------------------------------------------
const VIEWER_SELECTOR = '#viewer'
const DIVIDER_PX = 6

const applyViewerClip = (leftPct: number) => {
  if (!import.meta.client) return
  const viewerEl = document.querySelector<HTMLElement>(VIEWER_SELECTOR)
  if (!viewerEl) return

  const totalW = window.innerWidth
  const leftPx = (leftPct / 100) * totalW + DIVIDER_PX

  viewerEl.style.left = leftPx + 'px'
  viewerEl.style.right = '0px'
  viewerEl.style.width = `calc(100% - ${leftPx}px)`
}

const resetViewerClip = () => {
  if (!import.meta.client) return
  const viewerEl = document.querySelector<HTMLElement>(VIEWER_SELECTOR)
  if (!viewerEl) return
  viewerEl.style.left = ''
  viewerEl.style.right = ''
  viewerEl.style.width = ''
}

onMounted(() => {
  nextTick(() => {
    applyViewerClip(leftWidthPercent.value)
  })
})

onBeforeUnmount(() => {
  resetViewerClip()
})

// --------------------------------------------------------------------------
// Camera Sync
// --------------------------------------------------------------------------
const cadControls = ref<OrbitControls | null>(null)

// Writable ref tracking prop
const cameraEnabled = ref(props.cameraSyncEnabled)
watch(
  () => props.cameraSyncEnabled,
  (v) => {
    cameraEnabled.value = v
  }
)

const offsetRef = computed(() => props.offset)

// useCameraSync uses useInjectedViewerState() internally — must be called in setup()
useCameraSync({
  cadControls,
  cadViewer: cadViewerRef,
  offset: offsetRef,
  syncEnabled: cameraEnabled
})

const onCadControlsReady = (controls: OrbitControls) => {
  cadControls.value = controls
}

const onCadCalibratePick = (point: Vector3) => {
  if (!alignState.calibration.active || alignState.calibration.step !== 'cad') return
  setCalibrationCadPoint({ x: point.x, y: point.y, z: point.z })
}

const onCadChange = () => {}

const estimateCalibrationScale = (): number => {
  const cadBounds = cadViewerRef.value?.getModelBoundsInfo?.()
  const speckleSceneBox = speckleInstance.getRenderer().sceneBox as unknown as {
    getSize: (target: Vector3) => Vector3
  }

  if (!cadBounds || !speckleSceneBox) return 1

  const speckleSize = speckleSceneBox.getSize(new Vector3())
  const speckleMaxDim = Math.max(speckleSize.x, speckleSize.y, speckleSize.z)
  const cadMaxDim = cadBounds.maxDim

  if (
    !Number.isFinite(speckleMaxDim) ||
    !Number.isFinite(cadMaxDim) ||
    cadMaxDim <= 0
  ) {
    return 1
  }

  const estimated = speckleMaxDim / cadMaxDim
  if (!Number.isFinite(estimated) || estimated <= 0) return 1

  return estimated
}

const pickSpecklePoint = (event: MouseEvent): Vector3 | null => {
  const renderer = speckleInstance.getRenderer()
  const camera = renderer.renderingCamera
  if (!camera) return null

  const rect = speckleContainer.getBoundingClientRect()
  if (!rect.width || !rect.height) return null

  const ndc = new Vector2(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1
  )

  const results = renderer.intersections.intersect(
    renderer.scene,
    camera,
    ndc as unknown as never,
    undefined,
    true,
    renderer.clippingVolume
  ) as Array<{ point?: Vector3 }> | null

  return results?.[0]?.point ? new Vector3().copy(results[0].point) : null
}

const onSpeckleCalibrateClick = (event: MouseEvent) => {
  if (!alignState.calibration.active || alignState.calibration.step !== 'speckle')
    return

  const pickedPoint = pickSpecklePoint(event)
  if (!pickedPoint || !alignState.calibration.cadPoint) return

  setCalibrationSpecklePoint({
    x: pickedPoint.x,
    y: pickedPoint.y,
    z: pickedPoint.z
  })

  const scale = estimateCalibrationScale()
  const nextOffset = calcOffsetFromPoints(
    new Vector3(
      alignState.calibration.cadPoint.x,
      alignState.calibration.cadPoint.y,
      alignState.calibration.cadPoint.z
    ),
    pickedPoint,
    scale
  )

  setOffset(nextOffset)
  cancelCalibration()
}

onMounted(() => {
  speckleContainer.addEventListener('click', onSpeckleCalibrateClick, true)
})

onBeforeUnmount(() => {
  speckleContainer.removeEventListener('click', onSpeckleCalibrateClick, true)
})

defineExpose({})
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
}
.slide-down-enter-from,
.slide-down-leave-to {
  transform: translate(-50%, 8px);
  opacity: 0;
}

.slide-top-enter-active,
.slide-top-leave-active {
  transition: all 0.25s ease;
}
.slide-top-enter-from,
.slide-top-leave-to {
  transform: translateY(-12px);
  opacity: 0;
}
</style>
