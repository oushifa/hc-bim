import { ref } from 'vue'
import { Vector3, Vector2, Raycaster } from 'three'
import { CameraController } from '@speckle/viewer'
import { useInjectedViewerState } from '~/lib/viewer/composables/setup'
import type { RoamingRoute, RoamingPoint } from './types'
import { RoamingMode, EasingType } from './types'
import { useRoamingVisualizer } from './useRoamingVisualizer'

export const useRoamingController = () => {
  const {
    viewer: { instance }
  } = useInjectedViewerState()

  const visualizer = useRoamingVisualizer(() => instance)

  // 状态变量
  const isPicking = ref(false)
  const isPlaying = ref(false)
  const isPaused = ref(false)
  const currentRoute = ref<RoamingRoute | null>(null)
  const currentPointIndex = ref(0)
  const currentTime = ref(0)
  const totalTime = ref(0)
  const progress = ref(0)
  const playbackSpeed = ref(1.0)
  const isLoop = ref(false)

  let animationFrameId: number | null = null
  let lastTimestamp = 0
  let pickingHandler: ((e: PointerEvent | MouseEvent) => void) | null = null

  // 缓动函数映射
  const calculateEasing = (t: number, easing: EasingType): number => {
    const clampedT = Math.max(0, Math.min(1, t))
    switch (easing) {
      case EasingType.Linear:
        return clampedT
      case EasingType.EaseIn:
        return clampedT * clampedT
      case EasingType.EaseOut:
        return clampedT * (2 - clampedT)
      case EasingType.EaseInOut:
      default:
        return clampedT < 0.5
          ? 2 * clampedT * clampedT
          : -1 + (4 - 2 * clampedT) * clampedT
    }
  }

  // 1. 开始在模型上选点
  const startPicking = (onPointPicked: (point: [number, number, number]) => void) => {
    if (isPicking.value) return
    isPicking.value = true

    const container = instance.getContainer()
    const canvas = instance.getCanvas()
    container.style.cursor = 'crosshair'
    if (canvas) canvas.style.cursor = 'crosshair'

    let pointerDownPos = { x: 0, y: 0 }

    const onPointerDown = (event: MouseEvent | PointerEvent) => {
      pointerDownPos = { x: event.clientX, y: event.clientY }
    }

    pickingHandler = (event: MouseEvent | PointerEvent) => {
      if (!isPicking.value) return

      // 防止拖动相机旋转误判为点击选点
      const dist = Math.hypot(
        event.clientX - pointerDownPos.x,
        event.clientY - pointerDownPos.y
      )
      if (dist > 5) return

      try {
        const bounds = container.getBoundingClientRect()
        const x = event.clientX - bounds.left
        const y = event.clientY - bounds.top

        // 方案 1：使用 Speckle Viewer 标准的 Pick 查询
        const hits = instance.query<import('@speckle/viewer').IntersectionQuery>({
          point: new Vector3(x, y, 0),
          operation: 'Pick'
        })

        if (hits && hits.objects && hits.objects.length > 0 && hits.objects[0].point) {
          const pt = hits.objects[0].point
          onPointPicked([
            Number(pt.x.toFixed(3)),
            Number(pt.y.toFixed(3)),
            Number(pt.z.toFixed(3))
          ])
          return
        }

        // 方案 2：直接使用 Three.js 射线拾取保底
        const renderer = instance.getRenderer()
        const camera = renderer.renderingCamera
        if (camera) {
          const ndcX = (x / bounds.width) * 2 - 1
          const ndcY = -(y / bounds.height) * 2 + 1
          const raycaster = new Raycaster()
          raycaster.setFromCamera(new Vector2(ndcX, ndcY), camera)
          const intersects = raycaster.intersectObjects(renderer.scene.children, true)
          const validHit = intersects.find(
            (i) => i.point && i.object.layers.mask !== 16
          )
          if (validHit && validHit.point) {
            const pt = validHit.point
            onPointPicked([
              Number(pt.x.toFixed(3)),
              Number(pt.y.toFixed(3)),
              Number(pt.z.toFixed(3))
            ])
          }
        }
      } catch (e) {
        console.error('Roaming pick point error:', e)
      }
    }

    container.addEventListener('pointerdown', onPointerDown)
    container.addEventListener('pointerup', pickingHandler)
  }

  // 停止选点
  const stopPicking = () => {
    if (!isPicking.value) return
    isPicking.value = false

    const container = instance.getContainer()
    const canvas = instance.getCanvas()
    container.style.cursor = 'default'
    if (canvas) canvas.style.cursor = 'default'

    if (pickingHandler) {
      container.removeEventListener('pointerup', pickingHandler)
      pickingHandler = null
    }
  }

  // 2. 捕获当前视角关键帧
  const captureCurrentView = (
    name?: string,
    duration = 3
  ): RoamingPoint | null => {
    try {
      const cameraController = instance.getExtension(CameraController)
      const pos = cameraController.getPosition()
      const tgt = cameraController.getTarget()

      return {
        id: `view_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: name || `视角关键帧`,
        position: [Number(pos.x.toFixed(3)), Number(pos.y.toFixed(3)), Number(pos.z.toFixed(3))],
        target: [Number(tgt.x.toFixed(3)), Number(tgt.y.toFixed(3)), Number(tgt.z.toFixed(3))],
        duration,
        easing: EasingType.EaseInOut
      }
    } catch (e) {
      console.error('Failed to capture view:', e)
      return null
    }
  }

  // 定位到指定点位/视角进行预览
  const previewPoint = (
    point: RoamingPoint,
    mode: RoamingMode,
    eyeHeight = 1.6
  ) => {
    try {
      const cameraController = instance.getExtension(CameraController)
      const isPointMode = mode === RoamingMode.Point
      const eyeH = isPointMode ? eyeHeight : 0

      const pos = new Vector3(
        point.position[0],
        point.position[1],
        point.position[2] + eyeH
      )

      let tgt: Vector3
      if (isPointMode) {
        // 点位模式：相机置于该点位，视线朝前看
        tgt = new Vector3(point.target[0], point.target[1], point.target[2] + eyeH)
        if (tgt.distanceTo(pos) < 0.05) {
          tgt = pos.clone().add(new Vector3(5, 0, 0))
        }
      } else {
        tgt = new Vector3(point.target[0], point.target[1], point.target[2])
      }

      cameraController.setCameraView({ position: pos, target: tgt }, false)
      instance.requestRender()
    } catch (e) {
      console.error('Failed to preview point:', e)
    }
  }

  // 动画循环
  let accumulatedTime = 0
  let routeSegments: Array<{
    startPoint: RoamingPoint
    endPoint: RoamingPoint
    nextPoint?: RoamingPoint
    startDuration: number
    duration: number
    easing: EasingType
    pointIndex: number
  }> = []

  const prepareRouteSegments = (route: RoamingRoute) => {
    const points = route.points
    routeSegments = []
    if (points.length < 2) return

    let currentSum = 0
    for (let i = 1; i < points.length; i++) {
      const endPt = points[i]
      const dur = Math.max(0.2, endPt.duration || 3)
      routeSegments.push({
        startPoint: points[i - 1],
        endPoint: endPt,
        nextPoint: i + 1 < points.length ? points[i + 1] : route.loop ? points[0] : undefined,
        startDuration: currentSum,
        duration: dur,
        easing: endPt.easing || EasingType.EaseInOut,
        pointIndex: i
      })
      currentSum += dur
    }

    if (route.loop && points.length > 2) {
      const firstPt = points[0]
      const dur = Math.max(0.2, firstPt.duration || 3)
      routeSegments.push({
        startPoint: points[points.length - 1],
        endPoint: firstPt,
        nextPoint: points[1],
        startDuration: currentSum,
        duration: dur,
        easing: firstPt.easing || EasingType.EaseInOut,
        pointIndex: 0
      })
      currentSum += dur
    }

    totalTime.value = currentSum
  }

  const animationLoop = (timestamp: number) => {
    if (!isPlaying.value || isPaused.value || !currentRoute.value) {
      return
    }

    if (!lastTimestamp) lastTimestamp = timestamp
    const delta = ((timestamp - lastTimestamp) / 1000) * playbackSpeed.value
    lastTimestamp = timestamp

    accumulatedTime += delta
    currentTime.value = accumulatedTime

    if (totalTime.value > 0) {
      progress.value = Math.min(1, accumulatedTime / totalTime.value)
    }

    // 检查是否播放完毕
    if (accumulatedTime >= totalTime.value) {
      if (isLoop.value && totalTime.value > 0) {
        accumulatedTime = 0
      } else {
        stop()
        return
      }
    }

    // 找到当前所在的 segment
    let curSegment = routeSegments[0]
    for (let i = 0; i < routeSegments.length; i++) {
      const seg = routeSegments[i]
      if (
        accumulatedTime >= seg.startDuration &&
        accumulatedTime <= seg.startDuration + seg.duration
      ) {
        curSegment = seg
        break
      }
    }

    if (curSegment) {
      currentPointIndex.value = curSegment.pointIndex
      const segmentProgress =
        (accumulatedTime - curSegment.startDuration) / curSegment.duration
      const easedT = calculateEasing(segmentProgress, curSegment.easing)

      const isPointMode = currentRoute.value.mode === RoamingMode.Point
      const eyeH = isPointMode ? currentRoute.value.eyeHeight ?? 1.6 : 0

      let curPos: Vector3
      let curTarget: Vector3

      if (isPointMode) {
        // 【点位漫游】：镜头作为第一人称行进点，从 startPoint 移动到 endPoint
        const startPos = new Vector3(
          curSegment.startPoint.position[0],
          curSegment.startPoint.position[1],
          curSegment.startPoint.position[2] + eyeH
        )
        const endPos = new Vector3(
          curSegment.endPoint.position[0],
          curSegment.endPoint.position[1],
          curSegment.endPoint.position[2] + eyeH
        )

        curPos = startPos.clone().lerp(endPos, easedT)

        // 视线朝向向量：当前段朝向
        const dirCurrent = endPos.clone().sub(startPos).normalize()

        let headingDir = dirCurrent.clone()
        // 临近段终点（后 30% 进程）且存在下一拐弯点时，平滑插值转弯
        if (curSegment.nextPoint && easedT > 0.7) {
          const nextPos = new Vector3(
            curSegment.nextPoint.position[0],
            curSegment.nextPoint.position[1],
            curSegment.nextPoint.position[2] + eyeH
          )
          const dirNext = nextPos.clone().sub(endPos).normalize()
          const turnT = (easedT - 0.7) / 0.3
          headingDir.lerp(dirNext, turnT).normalize()
        }

        if (headingDir.lengthSq() < 1e-4) {
          headingDir.set(1, 0, 0)
        }

        // 保持视线前方恒定 10 米视距，防止奇异点
        curTarget = curPos.clone().add(headingDir.multiplyScalar(10))
      } else {
        // 【视角漫游】：相机位置与观察目标在关键帧之间同步平滑过渡
        const startPos = new Vector3(
          curSegment.startPoint.position[0],
          curSegment.startPoint.position[1],
          curSegment.startPoint.position[2]
        )
        const endPos = new Vector3(
          curSegment.endPoint.position[0],
          curSegment.endPoint.position[1],
          curSegment.endPoint.position[2]
        )
        const startTarget = new Vector3(
          curSegment.startPoint.target[0],
          curSegment.startPoint.target[1],
          curSegment.startPoint.target[2]
        )
        const endTarget = new Vector3(
          curSegment.endPoint.target[0],
          curSegment.endPoint.target[1],
          curSegment.endPoint.target[2]
        )

        curPos = startPos.clone().lerp(endPos, easedT)
        curTarget = startTarget.clone().lerp(endTarget, easedT)
      }

      // 更新相机位置与朝向
      try {
        const cameraController = instance.getExtension(CameraController)
        cameraController.setCameraView({ position: curPos, target: curTarget }, false)
        visualizer.renderRoute(currentRoute.value, curSegment.pointIndex, curPos)
        instance.requestRender()
      } catch (e) {
        console.error('Camera update error in roaming loop:', e)
      }
    }

    animationFrameId = requestAnimationFrame(animationLoop)
  }

  const playRoute = (route: RoamingRoute, startPointIdx = 0) => {
    if (!route || !route.points || route.points.length < 2) {
      console.warn('Cannot play route with less than 2 points')
      return
    }

    currentRoute.value = route
    playbackSpeed.value = route.speed || 1.0
    isLoop.value = !!route.loop

    prepareRouteSegments(route)

    // 计算起始时间
    if (startPointIdx > 0 && startPointIdx < route.points.length) {
      const foundSeg = routeSegments.find((s) => s.pointIndex === startPointIdx)
      accumulatedTime = foundSeg ? foundSeg.startDuration : 0
    } else {
      accumulatedTime = 0
    }

    // 播放前先将相机直接瞬移到起始点位
    try {
      const firstPt = route.points[startPointIdx > 0 ? startPointIdx : 0]
      previewPoint(firstPt, route.mode, route.eyeHeight)
      const cameraController = instance.getExtension(CameraController)
      cameraController.enabled = false // 漫游播放过程中锁定手动旋转
    } catch (e) {
      console.error(e)
    }

    isPlaying.value = true
    isPaused.value = false
    lastTimestamp = 0

    if (animationFrameId) cancelAnimationFrame(animationFrameId)
    animationFrameId = requestAnimationFrame(animationLoop)
  }

  const pause = () => {
    isPaused.value = true
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }
  }

  const resume = () => {
    if (!isPlaying.value) return
    isPaused.value = false
    lastTimestamp = 0
    animationFrameId = requestAnimationFrame(animationLoop)
  }

  const stop = () => {
    isPlaying.value = false
    isPaused.value = false
    accumulatedTime = 0
    currentTime.value = 0
    progress.value = 0
    currentPointIndex.value = 0

    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }

    try {
      const cameraController = instance.getExtension(CameraController)
      cameraController.enabled = true
      visualizer.renderRoute(currentRoute.value)
    } catch (e) {
      console.error(e)
    }
  }

  const setProgress = (targetProgress: number) => {
    if (!currentRoute.value || totalTime.value <= 0) return
    const targetTime = Math.max(0, Math.min(1, targetProgress)) * totalTime.value
    accumulatedTime = targetTime
    currentTime.value = targetTime
    progress.value = targetProgress

    if (!isPlaying.value) {
      lastTimestamp = 0
      animationLoop(performance.now())
    }
  }

  const setSpeed = (spd: number) => {
    playbackSpeed.value = spd
    if (currentRoute.value) {
      currentRoute.value.speed = spd
    }
  }

  const toggleLoop = () => {
    isLoop.value = !isLoop.value
    if (currentRoute.value) {
      currentRoute.value.loop = isLoop.value
      prepareRouteSegments(currentRoute.value)
    }
  }

  const dispose = () => {
    stop()
    stopPicking()
    visualizer.dispose()
  }

  return {
    isPicking,
    isPlaying,
    isPaused,
    currentRoute,
    currentPointIndex,
    currentTime,
    totalTime,
    progress,
    playbackSpeed,
    isLoop,
    visualizer,
    startPicking,
    stopPicking,
    captureCurrentView,
    previewPoint,
    playRoute,
    pause,
    resume,
    stop,
    setProgress,
    setSpeed,
    toggleLoop,
    dispose
  }
}
