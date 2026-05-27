<template>
  <!-- CAD Viewer: Three.js renderer for OBJ / glTF / DXF files -->
  <!-- eslint-disable vuejs-accessibility/no-static-element-interactions, vuejs-accessibility/click-events-have-key-events -->
  <div
    ref="containerEl"
    class="cad-viewer relative w-full h-full bg-[#0f111a] overflow-hidden select-none"
    tabindex="-1"
    @dragover.prevent="onDragOver"
    @dragleave="onDragLeave"
    @drop.prevent="onDrop"
    @click="onContainerClick"
    @dblclick="onContainerDoubleClick"
  >
    <!-- Three.js canvas -->
    <canvas ref="canvasEl" class="w-full h-full block" />

    <!-- Drop zone overlay -->
    <Transition name="fade">
      <div
        v-if="!hasModel && !isLoading"
        class="absolute inset-0 flex flex-col items-center justify-center gap-4 pointer-events-none z-10"
      >
        <div
          class="border-2 border-dashed rounded-2xl p-8 flex flex-col items-center gap-3 transition-all duration-200"
          :class="
            isDragging ? 'border-primary bg-primary/10 scale-105' : 'border-outline-3'
          "
        >
          <Upload class="w-10 h-10 text-foreground-2" />
          <p class="text-body-sm text-foreground-2 text-center">
            请在“新增联动”弹窗中选择或上传左屏图纸
            <br />
            <span class="text-foreground-3">加载后可在此执行三点校准与点位联动</span>
          </p>
        </div>
      </div>
    </Transition>

    <!-- Loading overlay -->
    <Transition name="fade">
      <div
        v-if="isLoading"
        class="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#0f111a]/80 z-20 backdrop-blur-sm"
      >
        <div class="w-48 h-1.5 bg-outline-3 rounded-full overflow-hidden">
          <div
            class="h-full bg-[#00b4b6] rounded-full transition-all duration-200"
            :style="{ width: loadProgress + '%' }"
          />
        </div>
        <p class="text-body-xs text-foreground-2">
          加载中 {{ Math.round(loadProgress) }}%
        </p>
      </div>
    </Transition>

    <!-- Top toolbar -->
    <div class="absolute top-2 left-2 right-2 flex items-center gap-2 z-10">
      <!-- <div
        class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-body-xs font-medium bg-foundation/90 border border-outline-2 text-foreground backdrop-blur-sm shadow-sm"
      >
        <Upload class="w-3.5 h-3.5" />
        {{ drawingLabel }}
      </div> -->

      <!-- <button
        v-if="hasModel"
        class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-body-xs font-medium bg-foundation/90 hover:bg-foundation border border-outline-2 text-foreground transition-colors backdrop-blur-sm shadow-sm"
        @click="fitToModel"
      >
        <Maximize2 class="w-3.5 h-3.5" />
        适应视图
      </button> -->

      <!-- <button
        v-if="hasModel"
        class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-body-xs font-medium bg-foundation/90 hover:bg-foundation border border-outline-2 text-foreground transition-colors backdrop-blur-sm shadow-sm"
        @click="clearModel"
      >
        <Trash2 class="w-3.5 h-3.5" />
        清除
      </button> -->
    </div>

    <!-- Calibration mode indicator - centered at top -->
    <Transition name="slide-in-right">
      <div
        v-if="calibrateMode"
        class="absolute top-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] text-body-xs font-medium bg-amber-500/20 border border-amber-500/50 text-amber-400 backdrop-blur-sm z-10"
      >
        <Crosshair class="w-3.5 h-3.5 animate-pulse" />
        校准模式 — 请点击特征点
      </div>
    </Transition>

    <!-- Camera sync status badge -->
    <Transition name="slide-down">
      <div
        v-if="cameraSync"
        class="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1 rounded-full text-body-xs font-medium bg-primary/20 border border-primary/50 text-primary backdrop-blur-sm z-10"
      >
        <Link2 class="w-3.5 h-3.5" />
        相机已联动
      </div>
    </Transition>

    <!-- Drag overlay -->
    <Transition name="fade">
      <div
        v-if="isDragging"
        class="absolute inset-0 border-2 border-primary rounded-none bg-primary/5 pointer-events-none z-30"
      />
    </Transition>

    <div
      v-for="marker in projectedCalibrationMarkers"
      :key="marker.index"
      class="absolute z-40 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-primary text-body-xs font-semibold text-white shadow-lg pointer-events-none"
      :style="{ left: `${marker.x}px`, top: `${marker.y}px` }"
    >
      {{ marker.index }}
    </div>

    <div
      v-if="projectedHighlightMarker"
      class="absolute z-50 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
      :style="{
        left: `${projectedHighlightMarker.x}px`,
        top: `${projectedHighlightMarker.y}px`
      }"
    >
      <div class="absolute inset-0 rounded-full bg-rose-500/25 animate-ping scale-[1.8]" />
      <div class="relative flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-rose-500 text-white shadow-xl">
        <Crosshair class="h-4 w-4" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  OrthographicCamera,
  AmbientLight,
  DirectionalLight,
  Box3,
  Vector3,
  Vector2,
  Raycaster,
  Color,
  Mesh,
  MeshBasicMaterial,
  SphereGeometry
} from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { Upload, Maximize2, Trash2, Link2, Crosshair } from 'lucide-vue-next'
import { parseDxfToGroup } from './DxfLoader'
import type { AlignmentDrawing } from './api'
import { useAlignmentApi } from './api'
import { useInjectedViewerState } from '~~/lib/viewer/composables/setup'

// --------------------------------------------------------------------------
// Props / emits
// --------------------------------------------------------------------------
interface Props {
  cameraSync?: boolean
  calibrateMode?: boolean
  drawing?: AlignmentDrawing | null
  markerPoint?: { x: number; y: number; z: number } | null
  calibrationMarkers?: Array<{
    index: 1 | 2 | 3
    cadPoint?: { x: number; y: number; z: number }
  }>
}

const props = withDefaults(defineProps<Props>(), {
  cameraSync: false,
  calibrateMode: false,
  drawing: null,
  markerPoint: null,
  calibrationMarkers: () => []
})

const emit = defineEmits<{
  (e: 'controls-ready', controls: OrbitControls): void
  (e: 'controls-change'): void
  (e: 'calibrate-pick', point: Vector3): void
  (e: 'navigate-pick', point: Vector3): void
}>()

// --------------------------------------------------------------------------
// Template refs
// --------------------------------------------------------------------------
const containerEl = useTemplateRef<HTMLDivElement>('containerEl')
const canvasEl = useTemplateRef<HTMLCanvasElement>('canvasEl')
const drawingLabel = computed(() => props.drawing?.fileName || '未加载图纸')
const api = useAlignmentApi()
const { projectId } = useInjectedViewerState()

// --------------------------------------------------------------------------
// State
// --------------------------------------------------------------------------
const hasModel = ref(false)
const isLoading = ref(false)
const loadProgress = ref(0)
const isDragging = ref(false)
const isThreeReady = ref(false)
const projectedCalibrationMarkers = ref<
  Array<{ index: 1 | 2 | 3; x: number; y: number }>
>([])
const projectedHighlightMarker = ref<{ x: number; y: number } | null>(null)

type ProjectionType = 'perspective' | 'orthographic'

interface CameraState {
  position: { x: number; y: number; z: number }
  target: { x: number; y: number; z: number }
  projection: ProjectionType
  fov: number
  zoom: number
}

interface ModelBoundsInfo {
  center: { x: number; y: number; z: number }
  size: { x: number; y: number; z: number }
  maxDim: number
}

interface DisposableMaterial {
  dispose: () => void
}

interface DisposableChild {
  geometry?: { dispose: () => void }
  material?: DisposableMaterial | DisposableMaterial[]
}

interface TraversableObject {
  traverse: (cb: (child: DisposableChild) => void) => void
}

interface PickableChild extends DisposableChild {
  isLine?: boolean
  isLineSegments?: boolean
  isMesh?: boolean
  matrixWorld?: { elements: number[] }
  localToWorld?: (vector: Vector3) => Vector3
  geometry?: DisposableChild['geometry'] & {
    attributes?: {
      position?: {
        count: number
        getX: (index: number) => number
        getY: (index: number) => number
        getZ: (index: number) => number
      }
    }
    index?: {
      count: number
      getX: (index: number) => number
    }
  }
}

// --------------------------------------------------------------------------
// Three.js objects
// --------------------------------------------------------------------------
let renderer: WebGLRenderer | null = null
let scene: Scene | null = null
let perspectiveCamera: PerspectiveCamera | null = null
let orthographicCamera: OrthographicCamera | null = null
let activeCamera: PerspectiveCamera | OrthographicCamera | null = null
let controls: OrbitControls | null = null
let currentModel: unknown = null
let animationFrameId: number | null = null
let resizeObserver: ResizeObserver | null = null
let markerMesh: Mesh | null = null
let currentHighlightPoint: Vector3 | null = null
let targetHighlightPoint: Vector3 | null = null
let pendingCameraState: Partial<CameraState> | null = null

const DEFAULT_FOV = 45
const MIN_CAMERA_DISTANCE = 0.01
const HIGHLIGHT_MARKER_LERP_ALPHA = 0.18
const HIGHLIGHT_MARKER_SNAP_DISTANCE = 0.01

const isOrthographic = (
  camera: PerspectiveCamera | OrthographicCamera | null
): camera is OrthographicCamera =>
  !!camera && (camera as OrthographicCamera).isOrthographicCamera === true

const getCurrentProjection = (): ProjectionType =>
  isOrthographic(activeCamera) ? 'orthographic' : 'perspective'

const getCameraDistance = (): number => {
  if (!controls) return 1
  return Math.max(
    controls.object.position.distanceTo(controls.target),
    MIN_CAMERA_DISTANCE
  )
}

const updateOrthographicFrustum = (distance = getCameraDistance()) => {
  if (!orthographicCamera || !containerEl.value || !perspectiveCamera) return
  const aspect =
    containerEl.value.clientWidth / Math.max(containerEl.value.clientHeight, 1)
  const height = 2 * distance * Math.tan((perspectiveCamera.fov * Math.PI) / 360)
  const width = height * aspect
  const zoom = orthographicCamera.zoom || 1

  orthographicCamera.left = -width / 2
  orthographicCamera.right = width / 2
  orthographicCamera.top = height / 2
  orthographicCamera.bottom = -height / 2
  orthographicCamera.zoom = zoom
  orthographicCamera.updateProjectionMatrix()
}

const syncCameraPose = (
  source: PerspectiveCamera | OrthographicCamera,
  target: PerspectiveCamera | OrthographicCamera
) => {
  target.position.copy(source.position)
  target.quaternion.copy(source.quaternion)
  target.up.copy(source.up)
  target.near = source.near
  target.far = source.far
  target.updateProjectionMatrix()
}

const setProjection = (projection: ProjectionType) => {
  if (!controls || !perspectiveCamera || !orthographicCamera) return
  const nextCamera =
    projection === 'orthographic' ? orthographicCamera : perspectiveCamera
  if (activeCamera === nextCamera) return

  if (activeCamera) {
    syncCameraPose(activeCamera, nextCamera)
  }

  activeCamera = nextCamera
  controls.object = activeCamera as unknown as never

  if (projection === 'orthographic') {
    orthographicCamera.zoom = 1
    updateOrthographicFrustum()
  } else {
    perspectiveCamera.aspect =
      (containerEl.value?.clientWidth || 1) /
      Math.max(containerEl.value?.clientHeight || 1, 1)
    perspectiveCamera.updateProjectionMatrix()
  }

  controls.update()
}

const getCameraState = (): CameraState | null => {
  if (!controls || !activeCamera || !perspectiveCamera || !orthographicCamera)
    return null

  return {
    position: {
      x: controls.object.position.x,
      y: controls.object.position.y,
      z: controls.object.position.z
    },
    target: {
      x: controls.target.x,
      y: controls.target.y,
      z: controls.target.z
    },
    projection: getCurrentProjection(),
    fov: perspectiveCamera.fov,
    zoom: isOrthographic(activeCamera) ? orthographicCamera.zoom : 1
  }
}

const getModelBoundsInfo = (): ModelBoundsInfo | null => {
  if (!currentModel) return null
  const box = new Box3().setFromObject(currentModel as never)
  const center = box.getCenter(new Vector3())
  const size = box.getSize(new Vector3())
  return {
    center: { x: center.x, y: center.y, z: center.z },
    size: { x: size.x, y: size.y, z: size.z },
    maxDim: Math.max(size.x, size.y, size.z)
  }
}

const applyCameraStateNow = (state: Partial<CameraState>) => {
  if (!controls || !perspectiveCamera || !orthographicCamera) return

  if (state.projection) {
    setProjection(state.projection)
  }

  if (typeof state.fov === 'number') {
    perspectiveCamera.fov = state.fov
    perspectiveCamera.updateProjectionMatrix()
  }

  if (state.position) {
    controls.object.position.set(state.position.x, state.position.y, state.position.z)
  }

  if (state.target) {
    controls.target.set(state.target.x, state.target.y, state.target.z)
  }

  const controlledCamera = controls.object as unknown as
    | PerspectiveCamera
    | OrthographicCamera

  if (isOrthographic(controlledCamera)) {
    updateOrthographicFrustum()
    if (typeof state.zoom === 'number') {
      orthographicCamera.zoom = state.zoom
      orthographicCamera.updateProjectionMatrix()
    }
  }

  controls.update()
}

const applyPendingCameraState = () => {
  if (!pendingCameraState) return
  applyCameraStateNow(pendingCameraState)
}

const applyCameraState = (state: Partial<CameraState>) => {
  pendingCameraState = { ...state }
  applyPendingCameraState()
}

// --------------------------------------------------------------------------
// Init
// --------------------------------------------------------------------------
const initThree = () => {
  if (!canvasEl.value || !containerEl.value) return

  const w = containerEl.value.clientWidth || 800
  const h = containerEl.value.clientHeight || 600

  // Renderer
  renderer = new WebGLRenderer({
    canvas: canvasEl.value,
    antialias: true,
    alpha: false
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(w, h)
  renderer.setClearColor(new Color('#0f111a'))
  renderer.shadowMap.enabled = true

  // Scene
  scene = new Scene()
  scene.background = new Color('#0f111a')

  // Cameras
  perspectiveCamera = new PerspectiveCamera(
    DEFAULT_FOV,
    w / h,
    MIN_CAMERA_DISTANCE,
    100000
  )
  perspectiveCamera.position.set(0, 5, 10)
  perspectiveCamera.up.set(0, 0, 1)

  orthographicCamera = new OrthographicCamera(
    -w / 2,
    w / 2,
    h / 2,
    -h / 2,
    MIN_CAMERA_DISTANCE,
    100000
  )
  orthographicCamera.position.copy(perspectiveCamera.position)
  orthographicCamera.quaternion.copy(perspectiveCamera.quaternion)
  orthographicCamera.up.set(0, 0, 1)
  activeCamera = perspectiveCamera

  // Lights
  const ambient = new AmbientLight(0xffffff, 0.6)
  scene.add(ambient)
  const dir = new DirectionalLight(0xffffff, 0.8)
  dir.position.set(10, 20, 10)
  dir.castShadow = true
  scene.add(dir)
  const dir2 = new DirectionalLight(0x8888ff, 0.3)
  dir2.position.set(-10, -5, -10)
  scene.add(dir2)

  // Controls
  controls = new OrbitControls(activeCamera as unknown as never, canvasEl.value)
  controls.enableDamping = true
  controls.dampingFactor = 0.08
  controls.addEventListener('change', () => emit('controls-change'))
  emit('controls-ready', controls)
  updateOrthographicFrustum()

  // Resize observer
  resizeObserver = new ResizeObserver(() => handleResize())
  resizeObserver.observe(containerEl.value)

  // Animation loop
  const animate = () => {
    animationFrameId = requestAnimationFrame(animate)
    controls?.update()
    updateProjectedCalibrationMarkers()
    updateHighlightMarkerAnimation()
    if (renderer && scene && activeCamera) {
      renderer.render(scene, activeCamera)
    }
  }
  animate()
}

const handleResize = () => {
  if (!containerEl.value || !renderer || !perspectiveCamera) return
  const w = containerEl.value.clientWidth
  const h = containerEl.value.clientHeight
  perspectiveCamera.aspect = w / h
  perspectiveCamera.updateProjectionMatrix()
  updateOrthographicFrustum()
  renderer.setSize(w, h)
}

// --------------------------------------------------------------------------
// File loading
// --------------------------------------------------------------------------

const onDragOver = () => {
  isDragging.value = true
}
const onDragLeave = () => {
  isDragging.value = false
}
const onDrop = (e: DragEvent) => {
  isDragging.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file) loadFile(file)
}

const loadFile = async (file: File) => {
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (!ext || !['dxf', 'obj', 'gltf', 'glb'].includes(ext)) {
    return
  }

  clearModel()
  isLoading.value = true
  loadProgress.value = 0

  const url = URL.createObjectURL(file)

  try {
    let object: unknown

    if (ext === 'dxf') {
      const text = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => {
          loadProgress.value = 50
          resolve(e.target?.result as string)
        }
        reader.onerror = reject
        reader.readAsText(file)
      })
      object = parseDxfToGroup(text)
      loadProgress.value = 100
    } else if (ext === 'obj') {
      const loader = new OBJLoader()
      object = await new Promise<unknown>((resolve, reject) => {
        loader.load(
          url,
          (obj) => resolve(obj),
          (xhr) => {
            if (xhr.lengthComputable)
              loadProgress.value = (xhr.loaded / xhr.total) * 100
          },
          reject
        )
      })
    } else {
      const loader = new GLTFLoader()
      const gltf = await new Promise<unknown>((resolve, reject) => {
        loader.load(
          url,
          (g) => resolve(g),
          (xhr) => {
            if (xhr.lengthComputable)
              loadProgress.value = (xhr.loaded / xhr.total) * 100
          },
          reject
        )
      })
      object = (gltf as { scene: unknown }).scene
    }

    loadProgress.value = 100
    scene?.add(object as never)
    currentModel = object
    hasModel.value = true
    fitToModel()
    applyPendingCameraState()
  } catch {
    loadProgress.value = 0
  } finally {
    isLoading.value = false
    URL.revokeObjectURL(url)
  }
}

const loadDrawingFromServer = async (drawing: AlignmentDrawing | null) => {
  const currentProjectId = projectId.value
  if (!isThreeReady.value) return
  if (!drawing || !currentProjectId) {
    clearModel()
    return
  }

  const ext = drawing.fileName.split('.').pop()?.toLowerCase()
  clearModel()
  isLoading.value = true
  loadProgress.value = 10

  try {
    let object: unknown

    if (ext === 'dxf') {
      const text = await api.fetchDrawingBlobText(currentProjectId, drawing.blobId)
      loadProgress.value = 60
      object = parseDxfToGroup(text)
    } else if (ext === 'obj') {
      const blob = await api.fetchDrawingBlob(currentProjectId, drawing.blobId)
      const url = URL.createObjectURL(blob)
      try {
        const loader = new OBJLoader()
        object = await new Promise<unknown>((resolve, reject) => {
          loader.load(url, resolve, undefined, reject)
        })
      } finally {
        URL.revokeObjectURL(url)
      }
    } else {
      const blob = await api.fetchDrawingBlob(currentProjectId, drawing.blobId)
      const url = URL.createObjectURL(blob)
      try {
        const loader = new GLTFLoader()
        const gltf = await new Promise<unknown>((resolve, reject) => {
          loader.load(url, resolve, undefined, reject)
        })
        object = (gltf as { scene: unknown }).scene
      } finally {
        URL.revokeObjectURL(url)
      }
    }

    scene?.add(object as never)
    currentModel = object
    hasModel.value = true
    loadProgress.value = 100
    fitToModel()
    applyPendingCameraState()
  } finally {
    isLoading.value = false
  }
}

// --------------------------------------------------------------------------
// Fit to model
// --------------------------------------------------------------------------
const fitToModel = () => {
  if (!currentModel || !controls || !perspectiveCamera) return

  const box = new Box3().setFromObject(currentModel as never)
  const center = box.getCenter(new Vector3())
  const size = box.getSize(new Vector3())
  const maxDim = Math.max(size.x, size.y, size.z)

  const fov = perspectiveCamera.fov * (Math.PI / 180)
  const cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 1.5

  const controlledCamera = controls.object as unknown as
    | PerspectiveCamera
    | OrthographicCamera
  controlledCamera.position.set(center.x, center.y + maxDim * 0.3, center.z + cameraZ)
  controlledCamera.near = cameraZ * 0.001
  controlledCamera.far = cameraZ * 100
  controlledCamera.updateProjectionMatrix()

  controls.target.set(center.x, center.y, center.z)
  if (isOrthographic(controlledCamera)) {
    controlledCamera.zoom = 1
    updateOrthographicFrustum(cameraZ)
  }
  controls.update()
}

// --------------------------------------------------------------------------
// Clear model
// --------------------------------------------------------------------------
const clearModel = () => {
  if (currentModel && scene) {
    const model = currentModel as TraversableObject
    model.traverse((child) => {
      if (child.geometry) child.geometry.dispose()
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((material) => material.dispose())
        } else {
          child.material.dispose()
        }
      }
    })
    scene.remove(currentModel as never)
    currentModel = null
  }
  hasModel.value = false
}

// --------------------------------------------------------------------------
// Marker / picking
// --------------------------------------------------------------------------
const ensureMarker = () => {
  if (markerMesh || !scene) return
  markerMesh = new Mesh(
    new SphereGeometry(0.6, 24, 24),
    new MeshBasicMaterial({
      color: '#ff5a5a'
    })
  )
  markerMesh.visible = false
  scene.add(markerMesh)
}

const updateMarker = (point: { x: number; y: number; z: number } | null) => {
  ensureMarker()
  if (!markerMesh) return

  if (!point) {
    targetHighlightPoint = null
    currentHighlightPoint = null
    markerMesh.visible = false
    projectedHighlightMarker.value = null
    return
  }

  targetHighlightPoint = new Vector3(point.x, point.y, point.z)
  if (!currentHighlightPoint) {
    currentHighlightPoint = targetHighlightPoint.clone()
  }
}

const projectWorldPointToScreen = (worldPoint: { x: number; y: number; z: number }) => {
  if (!containerEl.value || !activeCamera) return null

  const rect = containerEl.value.getBoundingClientRect()
  const projected = new Vector3(worldPoint.x, worldPoint.y, worldPoint.z).project(
    activeCamera as never
  )

  if (
    !Number.isFinite(projected.x) ||
    !Number.isFinite(projected.y) ||
    projected.z < -1 ||
    projected.z > 1
  ) {
    return null
  }

  return {
    x: ((projected.x + 1) / 2) * rect.width,
    y: ((1 - projected.y) / 2) * rect.height
  }
}

const updateProjectedCalibrationMarkers = () => {
  if (!containerEl.value || !activeCamera) {
    projectedCalibrationMarkers.value = []
    return
  }

  projectedCalibrationMarkers.value = props.calibrationMarkers
    .flatMap((marker) => {
      if (!marker.cadPoint) return []

      const projected = projectWorldPointToScreen(marker.cadPoint)
      if (!projected) return []

      return [
        {
          index: marker.index,
          x: projected.x,
          y: projected.y
        }
      ]
    })
    .sort((a, b) => a.index - b.index)
}

const syncHighlightMarkerDisplay = () => {
  ensureMarker()
  if (!markerMesh || !currentHighlightPoint) {
    if (markerMesh) markerMesh.visible = false
    projectedHighlightMarker.value = null
    return
  }

  markerMesh.visible = true
  markerMesh.position.copy(currentHighlightPoint)
  projectedHighlightMarker.value = projectWorldPointToScreen({
    x: currentHighlightPoint.x,
    y: currentHighlightPoint.y,
    z: currentHighlightPoint.z
  })
}

const updateHighlightMarkerAnimation = () => {
  if (!targetHighlightPoint) {
    currentHighlightPoint = null
    syncHighlightMarkerDisplay()
    return
  }

  if (!currentHighlightPoint) {
    currentHighlightPoint = targetHighlightPoint.clone()
    syncHighlightMarkerDisplay()
    return
  }

  currentHighlightPoint.lerp(targetHighlightPoint, HIGHLIGHT_MARKER_LERP_ALPHA)
  if (
    currentHighlightPoint.distanceToSquared(targetHighlightPoint) <=
    HIGHLIGHT_MARKER_SNAP_DISTANCE * HIGHLIGHT_MARKER_SNAP_DISTANCE
  ) {
    currentHighlightPoint.copy(targetHighlightPoint)
  }

  syncHighlightMarkerDisplay()
}

const pickPointFromEvent = (e: MouseEvent) => {
  if (!currentModel || !activeCamera || !renderer) return null

  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const pointer = { x: e.clientX, y: e.clientY }
  const ndc = new Vector2(
    ((e.clientX - rect.left) / rect.width) * 2 - 1,
    -((e.clientY - rect.top) / rect.height) * 2 + 1
  )

  const raycaster = new Raycaster()
  raycaster.params.Line.threshold = 4
  raycaster.params.Points.threshold = 8
  raycaster.setFromCamera(ndc, activeCamera as unknown as never)

  const projectToScreen = (worldPoint: Vector3) => {
    const projected = worldPoint.clone().project(activeCamera as never)
    if (!Number.isFinite(projected.x) || !Number.isFinite(projected.y)) return null

    return {
      x: rect.left + ((projected.x + 1) / 2) * rect.width,
      y: rect.top + ((1 - projected.y) / 2) * rect.height
    }
  }

  const getScreenDistance = (screenPoint: { x: number; y: number }) =>
    Math.hypot(screenPoint.x - pointer.x, screenPoint.y - pointer.y)

  const closestPointOnSegment = (
    segmentStart: { x: number; y: number },
    segmentEnd: { x: number; y: number }
  ) => {
    const abX = segmentEnd.x - segmentStart.x
    const abY = segmentEnd.y - segmentStart.y
    const lengthSquared = abX * abX + abY * abY
    const t =
      lengthSquared <= Number.EPSILON
        ? 0
        : Math.min(
            1,
            Math.max(
              0,
              ((pointer.x - segmentStart.x) * abX + (pointer.y - segmentStart.y) * abY) /
                lengthSquared
            )
          )

    return {
      x: segmentStart.x + abX * t,
      y: segmentStart.y + abY * t,
      t
    }
  }

  const lineThreshold = props.calibrateMode ? 18 : 12
  const endpointThreshold = props.calibrateMode ? 22 : 16
  let bestCandidate: { point: Vector3; distance: number } | null = null

  const updateCandidate = (candidate: { point: Vector3; distance: number } | null) => {
    if (!candidate) return
    if (!bestCandidate || candidate.distance < bestCandidate.distance) {
      bestCandidate = candidate
    }
  }

  ;(currentModel as TraversableObject).traverse((child) => {
    const pickableChild = child as PickableChild
    const positions = pickableChild.geometry?.attributes?.position
    if (!positions || !pickableChild.localToWorld) return

    const getWorldVertex = (vertexIndex: number) =>
      pickableChild.localToWorld!(
        new Vector3(
          positions.getX(vertexIndex),
          positions.getY(vertexIndex),
          positions.getZ(vertexIndex)
        )
      )

    const testVertex = (worldVertex: Vector3) => {
      const screenVertex = projectToScreen(worldVertex)
      if (!screenVertex) return
      const distance = getScreenDistance(screenVertex)
      if (distance <= endpointThreshold) {
        updateCandidate({ point: worldVertex.clone(), distance })
      }
    }

    const testSegment = (startIndex: number, endIndex: number) => {
      const worldStart = getWorldVertex(startIndex)
      const worldEnd = getWorldVertex(endIndex)
      const startScreen = projectToScreen(worldStart)
      const endScreen = projectToScreen(worldEnd)
      if (!startScreen || !endScreen) return

      testVertex(worldStart)
      testVertex(worldEnd)

      const closestScreenPoint = closestPointOnSegment(startScreen, endScreen)
      const distance = getScreenDistance(closestScreenPoint)
      if (distance > lineThreshold) return

      const snappedPoint = worldStart.clone().lerp(worldEnd, closestScreenPoint.t)
      updateCandidate({ point: snappedPoint, distance })
    }

    if (pickableChild.isLineSegments) {
      const index = pickableChild.geometry?.index
      if (index) {
        for (let i = 0; i < index.count - 1; i += 2) {
          testSegment(index.getX(i), index.getX(i + 1))
        }
      } else {
        for (let i = 0; i < positions.count - 1; i += 2) {
          testSegment(i, i + 1)
        }
      }
      return
    }

    if (pickableChild.isLine) {
      const index = pickableChild.geometry?.index
      if (index) {
        for (let i = 0; i < index.count - 1; i++) {
          testSegment(index.getX(i), index.getX(i + 1))
        }
      } else {
        for (let i = 0; i < positions.count - 1; i++) {
          testSegment(i, i + 1)
        }
      }
    }
  })

  const intersects = raycaster.intersectObject(currentModel as never, true)
  if (intersects[0]) {
    updateCandidate({
      point: intersects[0].point.clone(),
      distance: 6
    })
  }

  return bestCandidate?.point || null
}

const onContainerClick = (e: MouseEvent) => {
  if (!props.calibrateMode) return
  const point = pickPointFromEvent(e)
  if (point) emit('calibrate-pick', point)
}

const onContainerDoubleClick = (e: MouseEvent) => {
  const point = pickPointFromEvent(e)
  if (point) emit('navigate-pick', point)
}

// --------------------------------------------------------------------------
// Expose controls for parent
// --------------------------------------------------------------------------
defineExpose({
  getControls: () => controls,
  getCameraState,
  getModelBoundsInfo,
  applyCameraState,
  setProjection,
  fitToModel
})

// --------------------------------------------------------------------------
// Lifecycle
// --------------------------------------------------------------------------
onMounted(() => {
  if (import.meta.client) {
    initThree()
    isThreeReady.value = true
    void loadDrawingFromServer(props.drawing || null)
    updateMarker(props.markerPoint || null)
    syncHighlightMarkerDisplay()
  }
})

watch(
  () => props.drawing?.id,
  () => {
    if (!isThreeReady.value) return
    void loadDrawingFromServer(props.drawing || null)
  },
  { immediate: false }
)

watch(
  () => props.markerPoint,
  (point) => {
    if (!isThreeReady.value) return
    updateMarker(point || null)
    syncHighlightMarkerDisplay()
  },
  { immediate: false, deep: true }
)

watch(
  () => props.calibrationMarkers,
  () => {
    if (!isThreeReady.value) return
    updateProjectedCalibrationMarkers()
  },
  { immediate: false, deep: true }
)

onBeforeUnmount(() => {
  if (animationFrameId !== null) cancelAnimationFrame(animationFrameId)
  resizeObserver?.disconnect()
  controls?.dispose()
  if (markerMesh && scene) {
    scene.remove(markerMesh)
    markerMesh.geometry.dispose()
    ;(markerMesh.material as MeshBasicMaterial).dispose()
  }
  clearModel()
  renderer?.dispose()
})
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
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

.slide-in-right-enter-active,
.slide-in-right-leave-active {
  transition: all 0.25s ease;
}
.slide-in-right-enter-from,
.slide-in-right-leave-to {
  transform: translateX(8px);
  opacity: 0;
}
</style>
