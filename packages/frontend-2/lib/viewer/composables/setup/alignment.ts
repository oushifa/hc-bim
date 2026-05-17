import { reactive } from 'vue'
import type {
  AlignmentCameraState,
  AlignmentCalibrationPoint,
  AlignmentConfig,
  AlignmentDrawing
} from '~/components/viewer/alignments/api'
import type { CoordinateOffset } from '~/components/viewer/alignments/CoordinateOffset'
import {
  calcTransformFromCalibrationPoints,
  DEFAULT_OFFSET
} from '~/components/viewer/alignments/CoordinateOffset'

type Point3D = { x: number; y: number; z: number }
type CalibrationStep = 'cad' | 'speckle'
type EditorMode = 'create' | 'edit'

const createEmptyTransform = (): CoordinateOffset => ({ ...DEFAULT_OFFSET })
const createEmptyCalibrationPoints = (): AlignmentCalibrationPoint[] => []

/**
 * Shared alignment/split-screen state (singleton reactive).
 * Shared across Panel.vue and PageSetup.vue without Provide/Inject.
 */
export const alignmentState = reactive({
  splitScreenEnabled: false,
  splitRatio: 0.5,
  cameraSyncEnabled: false,
  offset: createEmptyTransform() as CoordinateOffset,
  drawings: [] as AlignmentDrawing[],
  configs: [] as AlignmentConfig[],
  activeConfigId: null as string | null,
  activeDrawingId: null as string | null,
  cadCameraState: null as AlignmentCameraState | null,
  speckleCameraState: null as AlignmentCameraState | null,
  cameraRestoreKey: 0,
  listLoading: false,
  listLoaded: false,
  editorOpen: false,
  editorMode: 'create' as EditorMode,
  editorSaving: false,
  highlightedCadPoint: null as Point3D | null,
  lastError: null as string | null,
  calibration: {
    active: false,
    awaitingCompletion: false,
    step: 'cad' as CalibrationStep,
    pointIndex: 0,
    points: createEmptyCalibrationPoints() as AlignmentCalibrationPoint[],
    pendingCadPoint: null as Point3D | null,
    markers: [] as Array<{
      index: 1 | 2 | 3
      cadPoint?: Point3D
      specklePoint?: Point3D
    }>
  }
})

const findConfigById = (configId: string | null) =>
  alignmentState.configs.find((item) => item.id === configId) || null

const findDrawingById = (drawingId: string | null) =>
  alignmentState.drawings.find((item) => item.id === drawingId) || null

const getDefaultHighlightedCadPoint = (
  config: AlignmentConfig | null
): Point3D | null => {
  const lastPoint = config?.calibrationPoints?.[config.calibrationPoints.length - 1]
  return lastPoint
    ? {
        x: lastPoint.cad.x,
        y: lastPoint.cad.y,
        z: lastPoint.cad.z
      }
    : null
}

export function useAlignmentState() {
  const cancelCalibration = () => {
    alignmentState.calibration.active = false
    alignmentState.calibration.awaitingCompletion = false
    alignmentState.calibration.step = 'cad'
    alignmentState.calibration.pointIndex = 0
    alignmentState.calibration.points = createEmptyCalibrationPoints()
    alignmentState.calibration.pendingCadPoint = null
    alignmentState.calibration.markers = []
  }

  const resetTransientState = () => {
    alignmentState.cameraSyncEnabled = false
    alignmentState.highlightedCadPoint = null
    alignmentState.cadCameraState = null
    alignmentState.speckleCameraState = null
    cancelCalibration()
  }

  const disableSplitScreen = () => {
    alignmentState.splitScreenEnabled = false
    resetTransientState()
  }

  const enableSplitScreen = () => {
    alignmentState.splitScreenEnabled = true
  }

  const toggleSplitScreen = () => {
    if (alignmentState.splitScreenEnabled) disableSplitScreen()
    else enableSplitScreen()
  }

  const setLists = (payload: {
    drawings?: AlignmentDrawing[]
    configs?: AlignmentConfig[]
    loaded?: boolean
  }) => {
    if (payload.drawings) alignmentState.drawings = payload.drawings
    if (payload.configs) alignmentState.configs = payload.configs
    if (payload.loaded !== undefined) alignmentState.listLoaded = payload.loaded
  }

  const setListLoading = (loading: boolean) => {
    alignmentState.listLoading = loading
  }

  const setLastError = (error: string | null) => {
    alignmentState.lastError = error
  }

  const setSplitRatio = (ratio: number) => {
    alignmentState.splitRatio = Math.min(0.8, Math.max(0.2, ratio))
  }

  const setOffset = (offset: CoordinateOffset) => {
    Object.assign(alignmentState.offset, { ...DEFAULT_OFFSET, ...offset })
  }

  const setHighlightedCadPoint = (point: Point3D | null) => {
    alignmentState.highlightedCadPoint = point
  }

  const setCadCameraState = (camera: AlignmentCameraState | null) => {
    alignmentState.cadCameraState = camera
  }

  const setSpeckleCameraState = (camera: AlignmentCameraState | null) => {
    alignmentState.speckleCameraState = camera
  }

  const applyConfig = (config: AlignmentConfig | null) => {
    cancelCalibration()
    alignmentState.activeConfigId = config?.id || null
    alignmentState.activeDrawingId = config?.drawingId || null
    alignmentState.splitRatio = 0.5
    alignmentState.highlightedCadPoint = getDefaultHighlightedCadPoint(config)
    alignmentState.cadCameraState = config?.cameraState?.cad || null
    alignmentState.speckleCameraState = config?.cameraState?.speckle || null
    alignmentState.calibration.points = config?.calibrationPoints
      ? config.calibrationPoints.map((point) => ({
          index: point.index,
          cad: { ...point.cad },
          speckle: { ...point.speckle }
        }))
      : []
    Object.assign(alignmentState.offset, {
      ...DEFAULT_OFFSET,
      ...(config?.transform || {})
    })
    alignmentState.cameraRestoreKey += 1
    if (config) enableSplitScreen()
  }

  const upsertDrawing = (drawing: AlignmentDrawing) => {
    const next = alignmentState.drawings.filter((item) => item.id !== drawing.id)
    alignmentState.drawings = [drawing, ...next]
  }

  const removeDrawing = (drawingId: string) => {
    alignmentState.drawings = alignmentState.drawings.filter(
      (item) => item.id !== drawingId
    )
    if (alignmentState.activeDrawingId === drawingId) {
      alignmentState.activeDrawingId = null
    }
  }

  const upsertConfig = (config: AlignmentConfig) => {
    const existingIndex = alignmentState.configs.findIndex(
      (item) => item.id === config.id
    )
    if (existingIndex === -1) {
      alignmentState.configs = [config, ...alignmentState.configs]
      return
    }

    alignmentState.configs = alignmentState.configs.map((item, index) =>
      index === existingIndex ? config : item
    )
  }

  const removeConfig = (configId: string) => {
    alignmentState.configs = alignmentState.configs.filter(
      (item) => item.id !== configId
    )
    if (alignmentState.activeConfigId === configId) {
      alignmentState.activeConfigId = null
      disableSplitScreen()
    }
  }

  const openEditor = (mode: EditorMode, configId?: string | null) => {
    alignmentState.editorMode = mode
    alignmentState.editorOpen = true
    if (configId) {
      alignmentState.activeConfigId = configId
    }
  }

  const closeEditor = () => {
    alignmentState.editorOpen = false
    cancelCalibration()
  }

  const setEditorSaving = (saving: boolean) => {
    alignmentState.editorSaving = saving
  }

  const startCalibration = () => {
    alignmentState.highlightedCadPoint = null
    alignmentState.calibration.active = true
    alignmentState.calibration.awaitingCompletion = false
    alignmentState.calibration.step = 'cad'
    alignmentState.calibration.pointIndex = 0
    alignmentState.calibration.points = []
    alignmentState.calibration.pendingCadPoint = null
    alignmentState.calibration.markers = []
  }

  const setCalibrationCadPoint = (point: Point3D) => {
    const markerIndex = (alignmentState.calibration.pointIndex + 1) as 1 | 2 | 3
    alignmentState.calibration.pendingCadPoint = point
    alignmentState.calibration.step = 'speckle'
    alignmentState.calibration.markers = [
      ...alignmentState.calibration.markers.filter(
        (item) => item.index !== markerIndex
      ),
      {
        index: markerIndex,
        cadPoint: { ...point }
      }
    ].sort((a, b) => a.index - b.index)
  }

  const setCalibrationSpecklePoint = (point: Point3D) => {
    const pendingCadPoint = alignmentState.calibration.pendingCadPoint
    if (!pendingCadPoint) return

    const nextPointIndex = alignmentState.calibration.pointIndex + 1
    const nextPoints = [
      ...alignmentState.calibration.points,
      {
        index: nextPointIndex as 1 | 2 | 3,
        cad: { ...pendingCadPoint },
        speckle: { ...point }
      }
    ]

    alignmentState.calibration.points = nextPoints
    alignmentState.calibration.pendingCadPoint = null
    alignmentState.calibration.markers = alignmentState.calibration.markers
      .map((item) =>
        item.index === nextPointIndex
          ? {
              ...item,
              specklePoint: { ...point }
            }
          : item
      )
      .sort((a, b) => a.index - b.index)

    if (nextPoints.length >= 3) {
      setOffset(calcTransformFromCalibrationPoints(nextPoints))
      alignmentState.calibration.active = false
      alignmentState.calibration.awaitingCompletion = true
      alignmentState.calibration.step = 'cad'
      alignmentState.calibration.pointIndex = nextPoints.length
      return
    }

    alignmentState.calibration.pointIndex = nextPoints.length
    alignmentState.calibration.step = 'cad'
  }

  const finishCalibration = () => {
    if (alignmentState.calibration.points.length < 3) return

    alignmentState.calibration.active = false
    alignmentState.calibration.awaitingCompletion = false
    alignmentState.calibration.markers = []
    alignmentState.calibration.pendingCadPoint = null

    const lastPoint =
      alignmentState.calibration.points[alignmentState.calibration.points.length - 1]
    alignmentState.highlightedCadPoint = lastPoint
      ? { ...lastPoint.cad }
      : alignmentState.highlightedCadPoint
  }

  return {
    state: alignmentState,
    enableSplitScreen,
    disableSplitScreen,
    toggleSplitScreen,
    toggleCameraSync: () => {
      alignmentState.cameraSyncEnabled = !alignmentState.cameraSyncEnabled
    },
    setLists,
    setListLoading,
    setLastError,
    setSplitRatio,
    setOffset,
    setHighlightedCadPoint,
    setCadCameraState,
    setSpeckleCameraState,
    applyConfig,
    upsertDrawing,
    removeDrawing,
    upsertConfig,
    removeConfig,
    openEditor,
    closeEditor,
    setEditorSaving,
    startCalibration,
    finishCalibration,
    cancelCalibration,
    setCalibrationCadPoint,
    setCalibrationSpecklePoint,
    findConfigById,
    findDrawingById
  }
}
