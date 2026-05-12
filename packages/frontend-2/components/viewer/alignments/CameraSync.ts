/**
 * CameraSync.ts — Bi-directional camera sync composable
 *
 * Strategy:
 *  - CAD (OrbitControls) change  → push to Speckle via CameraController.setCameraView()
 *  - Speckle camera changes      → push to CAD OrbitControls (one-way sync from Speckle)
 *
 * Anti-loop: isSyncing flag + requestAnimationFrame throttle + isFromCad guard.
 *
 * IMPORTANT: This composable MUST be called inside a Vue component setup()
 * because it calls useInjectedViewerState() which relies on Vue inject().
 */

import { watch, onBeforeUnmount } from 'vue'
import type { Ref } from 'vue'
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { Vector3 } from 'three'
import { CameraController, CameraEvent } from '@speckle/viewer'
import { useInjectedViewerState } from '~~/lib/viewer/composables/setup'
import type { CoordinateOffset } from './CoordinateOffset'
import { cadToSpeckle, speckleToCad } from './CoordinateOffset'

export type ProjectionType = 'perspective' | 'orthographic'

export interface CadCameraState {
  position: { x: number; y: number; z: number }
  target: { x: number; y: number; z: number }
  projection: ProjectionType
  fov: number
  zoom: number
}

export interface CadViewerBridge {
  getCameraState: () => CadCameraState | null
  applyCameraState: (state: Partial<CadCameraState>) => void
  getModelBoundsInfo?: () => {
    center: { x: number; y: number; z: number }
    size: { x: number; y: number; z: number }
    maxDim: number
  } | null
}

export function useCameraSync(options: {
  cadControls: Ref<OrbitControls | null>
  cadViewer: Ref<CadViewerBridge | null>
  offset: Ref<CoordinateOffset>
  syncEnabled: Ref<boolean>
}) {
  const { cadControls, cadViewer, offset, syncEnabled } = options

  const {
    viewer: { instance: speckleInstance }
  } = useInjectedViewerState()

  let isSyncing = false
  let rafId: number | null = null
  let isFromCad = false
  let speckleUpdateCount = 0
  let suppressSpeckleUntil = 0

  const getCameraController = (): CameraController | null => {
    try {
      return speckleInstance.getExtension(CameraController) ?? null
    } catch {
      return null
    }
  }

  const getCadCameraState = (): CadCameraState | null => {
    return cadViewer.value?.getCameraState() ?? null
  }

  const applyCadCameraState = (state: Partial<CadCameraState>) => {
    cadViewer.value?.applyCameraState(state)
  }

  const getSpeckleProjection = (cc: CameraController): ProjectionType => {
    return (cc.renderingCamera as { isOrthographicCamera?: boolean })
      .isOrthographicCamera
      ? 'orthographic'
      : 'perspective'
  }

  const setSpeckleProjection = (cc: CameraController, projection: ProjectionType) => {
    if (projection === 'orthographic') {
      cc.setOrthoCameraOn()
    } else {
      cc.setPerspectiveCameraOn()
    }
  }

  const setSpeckleFov = (cc: CameraController, fov: number) => {
    cc.fieldOfView = fov
    const controls = cc.controls as { setFieldOfView?: (value: number) => void }
    controls.setFieldOfView?.(fov)
  }

  const pushCadStateToSpeckle = () => {
    const cadState = getCadCameraState()
    const cc = getCameraController()
    if (!cc || !cadState) return

    const converted = cadToSpeckle(cadState.position, cadState.target, offset.value)

    isSyncing = true
    isFromCad = true
    try {
      setSpeckleProjection(cc, cadState.projection)
      setSpeckleFov(cc, cadState.fov)
      cc.setCameraView(
        {
          position: new Vector3(
            converted.position.x,
            converted.position.y,
            converted.position.z
          ),
          target: new Vector3(
            converted.target.x,
            converted.target.y,
            converted.target.z
          )
        } as unknown as never,
        false
      )
    } finally {
      setTimeout(() => {
        isSyncing = false
        isFromCad = false
      }, 120)
    }
  }

  const cancelRaf = () => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
  }

  // ── CAD → Speckle ─────────────────────────────────────────────────────────

  const onCadChange = () => {
    if (!syncEnabled.value || isSyncing) return
    const controls = cadControls.value
    if (!controls) return

    cancelRaf()

    rafId = requestAnimationFrame(() => {
      isSyncing = true
      isFromCad = true
      try {
        const cadState = getCadCameraState()
        const cc = getCameraController()
        if (!cc || !cadState) return

        const converted = cadToSpeckle(cadState.position, cadState.target, offset.value)

        setSpeckleProjection(cc, cadState.projection)
        setSpeckleFov(cc, cadState.fov)

        cc.setCameraView(
          {
            position: new Vector3(
              converted.position.x,
              converted.position.y,
              converted.position.z
            ),
            target: new Vector3(
              converted.target.x,
              converted.target.y,
              converted.target.z
            )
          } as unknown as never,
          false
        )
      } finally {
        setTimeout(() => {
          isSyncing = false
          isFromCad = false
        }, 60)
      }
    })
  }

  // ── Speckle → CAD ────────────────────────────────────────────────────────

  const onSpeckleChange = () => {
    if (!syncEnabled.value || isSyncing) return
    if (isFromCad) return
    if (Date.now() < suppressSpeckleUntil) return
    const controls = cadControls.value
    if (!controls) return

    if (speckleUpdateCount < 3) {
      speckleUpdateCount++
      return
    }

    cancelRaf()

    rafId = requestAnimationFrame(() => {
      isSyncing = true
      try {
        controls.removeEventListener('change', onCadChange)

        const cc = getCameraController()
        if (!cc) return

        const specklePos = {
          x: cc.getPosition().x,
          y: cc.getPosition().y,
          z: cc.getPosition().z
        }
        const speckleTgt = {
          x: cc.getTarget().x,
          y: cc.getTarget().y,
          z: cc.getTarget().z
        }

        const converted = speckleToCad(specklePos, speckleTgt, offset.value)

        applyCadCameraState({
          position: converted.position,
          target: converted.target,
          projection: getSpeckleProjection(cc),
          fov: cc.fieldOfView
        })
      } finally {
        setTimeout(() => {
          if (syncEnabled.value) {
            controls.addEventListener('change', onCadChange)
          }
          isSyncing = false
        }, 60)
      }
    })
  }

  // ── Subscription management ───────────────────────────────────────────────

  let cadUnsubscribe: (() => void) | null = null
  let speckleUnsubscribe: (() => void) | null = null

  const subscribeCAD = () => {
    const controls = cadControls.value
    if (!controls || cadUnsubscribe) return
    controls.addEventListener('change', onCadChange)
    cadUnsubscribe = () => {
      controls.removeEventListener('change', onCadChange)
      cadUnsubscribe = null
    }
  }

  const unsubscribeCAD = () => {
    cadUnsubscribe?.()
    cadUnsubscribe = null
  }

  const subscribeSpeckle = () => {
    if (speckleUnsubscribe) return
    const cc = getCameraController()
    if (!cc) return
    cc.on(CameraEvent.LateFrameUpdate, onSpeckleChange)
    speckleUnsubscribe = () => {
      cc.removeListener(CameraEvent.LateFrameUpdate, onSpeckleChange)
      speckleUnsubscribe = null
    }
  }

  const unsubscribeSpeckle = () => {
    speckleUnsubscribe?.()
    speckleUnsubscribe = null
  }

  const enable = () => {
    suppressSpeckleUntil = Date.now() + 1200
    speckleUpdateCount = 0
    subscribeCAD()
    pushCadStateToSpeckle()
    subscribeSpeckle()
  }

  const disable = () => {
    unsubscribeCAD()
    unsubscribeSpeckle()
    cancelRaf()
    isSyncing = false
    speckleUpdateCount = 0
  }

  // ── Watch syncEnabled ────────────────────────────────────────────────────

  watch(
    syncEnabled,
    (enabled) => {
      if (enabled) enable()
      else disable()
    },
    { immediate: false }
  )

  watch(cadControls, (controls) => {
    if (controls && syncEnabled.value) {
      unsubscribeCAD()
      subscribeCAD()
    }
  })

  onBeforeUnmount(() => {
    disable()
  })
}
