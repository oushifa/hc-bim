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
            拖拽 DXF / OBJ / glTF / GLB 文件到此处
            <br />
            <span class="text-foreground-3">或点击下方按钮选择文件</span>
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
            class="h-full bg-primary rounded-full transition-all duration-200"
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
      <!-- Upload button -->
      <button
        id="cad-upload-btn"
        class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-body-xs font-medium bg-foundation/90 hover:bg-foundation border border-outline-2 text-foreground transition-colors backdrop-blur-sm shadow-sm"
        @click="triggerFileInput"
      >
        <Upload class="w-3.5 h-3.5" />
        上传 DXF / CAD
      </button>

      <input
        ref="fileInputEl"
        type="file"
        accept=".dxf,.obj,.gltf,.glb"
        class="hidden"
        aria-label="选择 CAD 文件"
        @change="onFileSelected"
      />

      <!-- Fit view -->
      <button
        v-if="hasModel"
        class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-body-xs font-medium bg-foundation/90 hover:bg-foundation border border-outline-2 text-foreground transition-colors backdrop-blur-sm shadow-sm"
        @click="fitToModel"
      >
        <Maximize2 class="w-3.5 h-3.5" />
        适应视图
      </button>

      <!-- Clear model -->
      <button
        v-if="hasModel"
        class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-body-xs font-medium bg-foundation/90 hover:bg-foundation border border-outline-2 text-foreground transition-colors backdrop-blur-sm shadow-sm"
        @click="clearModel"
      >
        <Trash2 class="w-3.5 h-3.5" />
        清除
      </button>

      <div class="flex-1" />

      <!-- Calibration mode indicator -->
      <Transition name="slide-in-right">
        <div
          v-if="calibrateMode"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-body-xs font-medium bg-amber-500/20 border border-amber-500/50 text-amber-400 backdrop-blur-sm"
        >
          <Crosshair class="w-3.5 h-3.5 animate-pulse" />
          校准模式 — 请点击特征点
        </div>
      </Transition>
    </div>

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
  Color
} from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { Upload, Maximize2, Trash2, Link2, Crosshair } from 'lucide-vue-next'
import { parseDxfToGroup } from './DxfLoader'

// --------------------------------------------------------------------------
// Props / emits
// --------------------------------------------------------------------------
interface Props {
  cameraSync?: boolean
  calibrateMode?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  cameraSync: false,
  calibrateMode: false
})

const emit = defineEmits<{
  (e: 'controls-ready', controls: OrbitControls): void
  (e: 'controls-change'): void
  (e: 'calibrate-pick', point: Vector3): void
}>()

// --------------------------------------------------------------------------
// Template refs
// --------------------------------------------------------------------------
const containerEl = useTemplateRef<HTMLDivElement>('containerEl')
const canvasEl = useTemplateRef<HTMLCanvasElement>('canvasEl')
const fileInputEl = useTemplateRef<HTMLInputElement>('fileInputEl')

// --------------------------------------------------------------------------
// State
// --------------------------------------------------------------------------
const hasModel = ref(false)
const isLoading = ref(false)
const loadProgress = ref(0)
const isDragging = ref(false)

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

const DEFAULT_FOV = 45
const MIN_CAMERA_DISTANCE = 0.01

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

const applyCameraState = (state: Partial<CameraState>) => {
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
const triggerFileInput = () => {
  fileInputEl.value?.click()
}

const onFileSelected = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file)
    loadFile(file)
    // Reset input so the same file can be re-selected
  ;(e.target as HTMLInputElement).value = ''
}

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
  } catch {
    loadProgress.value = 0
  } finally {
    isLoading.value = false
    URL.revokeObjectURL(url)
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
// Calibration click
// --------------------------------------------------------------------------
const onContainerClick = (e: MouseEvent) => {
  if (!props.calibrateMode || !currentModel || !activeCamera || !renderer) return

  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const ndc = new Vector2(
    ((e.clientX - rect.left) / rect.width) * 2 - 1,
    -((e.clientY - rect.top) / rect.height) * 2 + 1
  )

  const raycaster = new Raycaster()
  raycaster.setFromCamera(ndc, activeCamera as unknown as never)

  const intersects = raycaster.intersectObject(currentModel as never, true)
  if (intersects.length > 0) {
    emit('calibrate-pick', intersects[0].point)
  }
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
  }
})

onBeforeUnmount(() => {
  if (animationFrameId !== null) cancelAnimationFrame(animationFrameId)
  resizeObserver?.disconnect()
  controls?.dispose()
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
