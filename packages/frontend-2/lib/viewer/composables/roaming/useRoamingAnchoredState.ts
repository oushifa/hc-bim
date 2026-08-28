import { ref } from 'vue'
import type { CSSProperties } from 'vue'
import { Vector3 } from 'three'
import type { RoamingRoute, RoamingPoint } from './types'

export interface AnchoredRoamingPointItem {
  point: RoamingPoint
  index: number
  isSelected: boolean
  location: Vector3
  isOccluded: boolean
  style: Partial<CSSProperties>
}

// 共享的当前正在编辑或查看的漫游路线与选中点位
const activeRoute = ref<RoamingRoute | null>(null)
const selectedPointIndex = ref<number | null>(null)
const onPointSelectCallbacks = new Set<(index: number) => void>()

export const useRoamingAnchoredState = () => {
  const setActiveRoute = (route: RoamingRoute | null) => {
    activeRoute.value = route
  }

  const setSelectedPointIndex = (idx: number | null) => {
    selectedPointIndex.value = idx
  }

  const registerPointSelectCallback = (cb: (index: number) => void) => {
    onPointSelectCallbacks.add(cb)
    return () => {
      onPointSelectCallbacks.delete(cb)
    }
  }

  const triggerPointSelect = (index: number) => {
    selectedPointIndex.value = index
    onPointSelectCallbacks.forEach((cb) => cb(index))
  }

  return {
    activeRoute,
    selectedPointIndex,
    setActiveRoute,
    setSelectedPointIndex,
    registerPointSelectCallback,
    triggerPointSelect
  }
}
