import { reactive } from 'vue'
import type { CoordinateOffset } from '~/components/viewer/alignments/CoordinateOffset'
import { DEFAULT_OFFSET } from '~/components/viewer/alignments/CoordinateOffset'

type Point3D = { x: number; y: number; z: number }
type CalibrationStep = 'cad' | 'speckle'

/**
 * Shared alignment/split-screen state (singleton reactive).
 * Shared across Panel.vue and PageSetup.vue without Provide/Inject.
 */
export const alignmentState = reactive({
  /** Whether split-screen mode is enabled */
  splitScreenEnabled: false,

  /** 0.2 ~ 0.8 split ratio (left pane = CAD) */
  splitRatio: 0.5,

  /** Whether camera sync between CAD ↔ Speckle is active */
  cameraSyncEnabled: false,

  /** Coordinate offset CAD → Speckle */
  offset: { ...DEFAULT_OFFSET } as CoordinateOffset,

  /** One-point calibration workflow state */
  calibration: {
    active: false,
    step: 'cad' as CalibrationStep,
    cadPoint: null as Point3D | null,
    specklePoint: null as Point3D | null
  }
})

export function useAlignmentState() {
  const cancelCalibration = () => {
    alignmentState.calibration.active = false
    alignmentState.calibration.step = 'cad'
    alignmentState.calibration.cadPoint = null
    alignmentState.calibration.specklePoint = null
  }

  const resetTransientState = () => {
    alignmentState.cameraSyncEnabled = false
    cancelCalibration()
  }

  const disableSplitScreen = () => {
    if (!alignmentState.splitScreenEnabled) {
      resetTransientState()
      return
    }

    alignmentState.splitScreenEnabled = false
    resetTransientState()
  }

  const enableSplitScreen = () => {
    alignmentState.splitScreenEnabled = true
  }

  const toggleSplitScreen = () => {
    if (alignmentState.splitScreenEnabled) {
      disableSplitScreen()
    } else {
      enableSplitScreen()
    }
  }

  const toggleCameraSync = () => {
    alignmentState.cameraSyncEnabled = !alignmentState.cameraSyncEnabled
  }

  const startCalibration = () => {
    alignmentState.cameraSyncEnabled = false
    alignmentState.calibration.active = true
    alignmentState.calibration.step = 'cad'
    alignmentState.calibration.cadPoint = null
    alignmentState.calibration.specklePoint = null
  }

  const setCalibrationCadPoint = (point: Point3D) => {
    alignmentState.calibration.cadPoint = point
    alignmentState.calibration.step = 'speckle'
  }

  const setCalibrationSpecklePoint = (point: Point3D) => {
    alignmentState.calibration.specklePoint = point
  }

  const setSplitRatio = (ratio: number) => {
    alignmentState.splitRatio = Math.min(0.8, Math.max(0.2, ratio))
  }

  const setOffset = (offset: CoordinateOffset) => {
    Object.assign(alignmentState.offset, offset)
  }

  return {
    state: alignmentState,
    enableSplitScreen,
    disableSplitScreen,
    toggleSplitScreen,
    toggleCameraSync,
    startCalibration,
    cancelCalibration,
    setCalibrationCadPoint,
    setCalibrationSpecklePoint,
    setSplitRatio,
    setOffset
  }
}
