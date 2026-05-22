<template>
  <!-- eslint-disable vuejs-accessibility/no-static-element-interactions -->
  <div
    ref="containerEl"
    class="split-screen-root fixed inset-0 flex overflow-hidden pointer-events-none"
    :style="{ zIndex: 20, left: leftMenuWidth + 'px', width: `calc(100vw - ${leftMenuWidth}px)` }"
  >
    <div
      class="cad-pane relative h-full flex-shrink-0 overflow-hidden pointer-events-auto"
      :style="{ width: leftWidthPercent + '%' }"
    >
      <ViewerAlignmentsCadViewer
        ref="cadViewerRef"
        :drawing="drawing"
        :marker-point="alignState.highlightedCadPoint"
        :calibration-markers="alignState.calibration.markers"
        :calibrate-mode="
          alignState.calibration.active && alignState.calibration.step === 'cad'
        "
        @controls-change="captureCadCameraState"
        @calibrate-pick="onCadCalibratePick"
        @navigate-pick="onCadNavigatePick"
      />
    </div>

    <div
      class="divider relative z-30 h-full flex-shrink-0 select-none overflow-visible cursor-col-resize group pointer-events-auto"
      style="width: 6px"
      @mousedown.prevent="startDrag"
    >
      <div
        class="absolute inset-0 transition-colors duration-150 group-hover:bg-primary"
        :class="isDragging ? 'bg-primary' : 'bg-outline-2'"
      />
      <div
        class="absolute inset-x-0 inset-y-0 flex flex-col items-center justify-center gap-1 pointer-events-none"
      >
        <div
          v-for="i in 5"
          :key="i"
          class="h-1 w-1 rounded-full transition-colors pointer-events-none"
          :class="isDragging ? 'bg-white' : 'bg-outline-3 group-hover:bg-white'"
        />
      </div>
      <Transition name="fade">
        <div
          v-if="isDragging"
          class="absolute left-3 top-1/2 -translate-y-1/2 whitespace-nowrap rounded border border-outline-2 bg-foundation px-2 py-0.5 text-body-xs text-foreground shadow-md pointer-events-none"
        >
          {{ Math.round(leftWidthPercent) }}% /
          {{ Math.round(100 - leftWidthPercent) }}%
        </div>
      </Transition>
    </div>

    <div
      ref="specklePaneEl"
      class="speckle-pane relative h-full flex-1 overflow-hidden pointer-events-none"
    >
      <Transition name="slide-down">
        <div
          v-if="
            alignState.calibration.active || alignState.calibration.awaitingCompletion
          "
          class="absolute left-1/2 top-2 z-20 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/15 px-3 py-1.5 text-body-xs font-medium text-amber-400 backdrop-blur-sm pointer-events-none"
        >
          <Crosshair class="h-3.5 w-3.5" />
          {{
            alignState.calibration.awaitingCompletion
              ? '三点已采集完成，请点击完成校准'
              : alignState.calibration.step === 'cad'
              ? `第 ${Math.min(
                  alignState.calibration.pointIndex + 1,
                  3
                )} 个点：请先点击左侧 CAD`
              : `第 ${Math.min(
                  alignState.calibration.pointIndex + 1,
                  3
                )} 个点：请点击右侧 BIM 对应位置`
          }}
        </div>
      </Transition>

      <Transition name="slide-down">
        <div
          v-if="
            !alignState.calibration.active && !alignState.calibration.awaitingCompletion
          "
          class="absolute bottom-2 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-primary/40 bg-primary/15 px-3 py-1 text-body-xs font-medium text-primary backdrop-blur-sm pointer-events-none"
        >
          <MapPinned class="h-3.5 w-3.5" />
          左屏双击右聚焦并刷新 marker，右屏双击左侧定位
        </div>
      </Transition>

      <div
        v-for="marker in speckleCalibrationMarkers"
        :key="marker.key"
        class="absolute z-40 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-primary text-body-xs font-semibold text-white shadow-lg pointer-events-none"
        :style="{ left: `${marker.x}px`, top: `${marker.y}px` }"
      >
        {{ marker.index }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CameraController } from '@speckle/viewer'
import { Crosshair, MapPinned } from 'lucide-vue-next'
import { Vector2, Vector3 } from 'three'
import type { AlignmentCameraState, AlignmentDrawing } from './api'
import type { CoordinateOffset } from './CoordinateOffset'
import {
  transformCadToSpecklePoint,
  transformSpeckleToCadPoint
} from './CoordinateOffset'
import { useInjectedViewerState } from '~~/lib/viewer/composables/setup'
import { useAlignmentState } from '~/lib/viewer/composables/setup/alignment'

interface Props {
  splitRatio?: number
  offset?: CoordinateOffset
  cameraSyncEnabled?: boolean
  drawing?: AlignmentDrawing | null
}

const props = withDefaults(defineProps<Props>(), {
  splitRatio: 0.5,
  offset: () => ({ dx: 0, dy: 0, dz: 0, scale: 1, rotationZ: 0 }),
  cameraSyncEnabled: false,
  drawing: null
})

const {
  state: alignState,
  setCalibrationCadPoint,
  setCalibrationSpecklePoint,
  setHighlightedCadPoint,
  setCadCameraState,
  setSpeckleCameraState
} = useAlignmentState()

const {
  viewer: { instance: speckleInstance, container: speckleContainer },
  ui: {
    camera: { isOrthoProjection }
  }
} = useInjectedViewerState()

const emit = defineEmits<{
  (e: 'update:splitRatio', v: number): void
}>()

const containerEl = useTemplateRef<HTMLDivElement>('containerEl')
const cadViewerRef = useTemplateRef<{
  getCameraState: () => AlignmentCameraState | null
  applyCameraState: (state: AlignmentCameraState) => void
}>('cadViewerRef')
const specklePaneEl = useTemplateRef<HTMLDivElement>('specklePaneEl')
const leftWidthPercent = ref(props.splitRatio * 100)
const isDragging = ref(false)
const speckleCalibrationMarkers = ref<
  Array<{ key: string; index: 1 | 2 | 3; x: number; y: number }>
>([])

// Left menu width (from Left.vue)
const leftMenuWidth = 316

let projectionFrameId: number | null = null

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

watch(
  () => props.splitRatio,
  (v) => {
    leftWidthPercent.value = v * 100
    applyViewerClip(v * 100)
  }
)

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

const getCameraController = (): CameraController | null => {
  try {
    return speckleInstance.getExtension(CameraController) ?? null
  } catch {
    return null
  }
}

const captureCadCameraState = () => {
  setCadCameraState(cadViewerRef.value?.getCameraState() ?? null)
}

const getCurrentSpeckleCameraState = (): AlignmentCameraState | null => {
  const cc = getCameraController()
  const renderer = speckleInstance.getRenderer()
  const camera = renderer.renderingCamera
  if (!cc || !camera) return null

  const state: AlignmentCameraState = {
    position: {
      x: cc.getPosition().x,
      y: cc.getPosition().y,
      z: cc.getPosition().z
    },
    target: {
      x: cc.getTarget().x,
      y: cc.getTarget().y,
      z: cc.getTarget().z
    },
    projection: isOrthoProjection.value ? 'orthographic' : 'perspective'
  }

  if ('fov' in camera && typeof camera.fov === 'number') {
    state.fov = camera.fov
  }
  if ('zoom' in camera && typeof camera.zoom === 'number') {
    state.zoom = camera.zoom
  }

  return state
}

const captureSpeckleCameraState = () => {
  setSpeckleCameraState(getCurrentSpeckleCameraState())
}

const applySavedSpeckleCameraState = (cameraState: AlignmentCameraState | null) => {
  if (!cameraState) return

  const cc = getCameraController()
  if (!cc) return

  if (
    cameraState.projection &&
    (cameraState.projection === 'orthographic') !== isOrthoProjection.value
  ) {
    isOrthoProjection.value = cameraState.projection === 'orthographic'
  }

  cc.setCameraView(
    {
      position: new Vector3(
        cameraState.position.x,
        cameraState.position.y,
        cameraState.position.z
      ),
      target: new Vector3(
        cameraState.target.x,
        cameraState.target.y,
        cameraState.target.z
      )
    } as unknown as never,
    true
  )
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

const updateSpeckleCalibrationMarkers = () => {
  const paneEl = specklePaneEl.value
  const renderer = speckleInstance.getRenderer()
  const camera = renderer.renderingCamera

  if (!paneEl || !camera) {
    speckleCalibrationMarkers.value = []
    return
  }

  const rect = paneEl.getBoundingClientRect()
  speckleCalibrationMarkers.value = alignState.calibration.markers
    .flatMap((marker) => {
      if (!marker.specklePoint) return []

      const projected = new Vector3(
        marker.specklePoint.x,
        marker.specklePoint.y,
        marker.specklePoint.z
      ).project(camera as never)

      if (
        !Number.isFinite(projected.x) ||
        !Number.isFinite(projected.y) ||
        projected.z < -1 ||
        projected.z > 1
      ) {
        return []
      }

      return [
        {
          key: `speckle-${marker.index}`,
          index: marker.index,
          x: ((projected.x + 1) / 2) * rect.width,
          y: ((1 - projected.y) / 2) * rect.height
        }
      ]
    })
    .sort((a, b) => a.index - b.index)
}

const startProjectionLoop = () => {
  const tick = () => {
    updateSpeckleCalibrationMarkers()
    captureCadCameraState()
    captureSpeckleCameraState()
    projectionFrameId = requestAnimationFrame(tick)
  }
  tick()
}

const focusSpeckleAtPoint = (point: { x: number; y: number; z: number }) => {
  const cc = getCameraController()
  if (!cc) return

  const currentPosition = cc.getPosition()
  const currentTarget = cc.getTarget()
  const delta = new Vector3().subVectors(currentPosition, currentTarget)
  const currentDistance = delta.length()
  const direction =
    currentDistance > Number.EPSILON
      ? delta.clone().normalize()
      : new Vector3(1, 1, 1).normalize()
  const focusDistance = Math.max(currentDistance * 0.35, 0.01)
  const nextTarget = new Vector3(point.x, point.y, point.z)
  const nextPosition = nextTarget.clone().add(direction.multiplyScalar(focusDistance))

  cc.setCameraView(
    {
      position: nextPosition,
      target: nextTarget
    } as unknown as never,
    true
  )
}

const onCadCalibratePick = (point: Vector3) => {
  if (!alignState.calibration.active || alignState.calibration.step !== 'cad') return
  setCalibrationCadPoint({ x: point.x, y: point.y, z: point.z })
}

const onCadNavigatePick = (point: Vector3) => {
  if (alignState.calibration.active || alignState.calibration.awaitingCompletion) return
  if (alignState.calibration.points.length < 3) return
  setHighlightedCadPoint({ x: point.x, y: point.y, z: point.z })
  focusSpeckleAtPoint(transformCadToSpecklePoint(point, props.offset))
}

const onSpeckleClick = (event: MouseEvent) => {
  if (!alignState.calibration.active || alignState.calibration.step !== 'speckle')
    return
  const pickedPoint = pickSpecklePoint(event)
  if (!pickedPoint) return

  setCalibrationSpecklePoint({
    x: pickedPoint.x,
    y: pickedPoint.y,
    z: pickedPoint.z
  })
}

const onSpeckleDoubleClick = (event: MouseEvent) => {
  if (alignState.calibration.active || alignState.calibration.awaitingCompletion) return
  if (alignState.calibration.points.length < 3) return
  const pickedPoint = pickSpecklePoint(event)
  if (!pickedPoint) return

  setHighlightedCadPoint(transformSpeckleToCadPoint(pickedPoint, props.offset))
}

onMounted(() => {
  nextTick(() => {
    applyViewerClip(leftWidthPercent.value)
    captureCadCameraState()
    captureSpeckleCameraState()
  })
  startProjectionLoop()
  speckleContainer.addEventListener('click', onSpeckleClick, true)
  speckleContainer.addEventListener('dblclick', onSpeckleDoubleClick, true)
})

onBeforeUnmount(() => {
  resetViewerClip()
  if (projectionFrameId !== null) cancelAnimationFrame(projectionFrameId)
  speckleContainer.removeEventListener('click', onSpeckleClick, true)
  speckleContainer.removeEventListener('dblclick', onSpeckleDoubleClick, true)
})

watch(
  () => alignState.cameraRestoreKey,
  async () => {
    if (!alignState.activeConfigId) return
    const cadCameraState = alignState.cadCameraState
      ? JSON.parse(JSON.stringify(alignState.cadCameraState))
      : null
    const speckleCameraState = alignState.speckleCameraState
      ? JSON.parse(JSON.stringify(alignState.speckleCameraState))
      : null
    await nextTick()
    if (cadCameraState) {
      cadViewerRef.value?.applyCameraState(cadCameraState)
    }
    if (speckleCameraState) {
      applySavedSpeckleCameraState(speckleCameraState)
    }
  },
  { immediate: true }
)
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
