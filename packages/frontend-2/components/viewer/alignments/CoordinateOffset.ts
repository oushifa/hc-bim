import type { Vector3 } from 'three'

export interface CoordinateOffset {
  dx: number
  dy: number
  dz: number
  scale: number
}

export const DEFAULT_OFFSET: CoordinateOffset = {
  dx: 0,
  dy: 0,
  dz: 0,
  scale: 1
}

/**
 * Apply offset: convert CAD position → Speckle position
 */
export function cadToSpeckle(
  pos: { x: number; y: number; z: number },
  target: { x: number; y: number; z: number },
  offset: CoordinateOffset
): {
  position: { x: number; y: number; z: number }
  target: { x: number; y: number; z: number }
} {
  const s = offset.scale || 1
  return {
    position: {
      x: pos.x * s + offset.dx,
      y: pos.y * s + offset.dy,
      z: pos.z * s + offset.dz
    },
    target: {
      x: target.x * s + offset.dx,
      y: target.y * s + offset.dy,
      z: target.z * s + offset.dz
    }
  }
}

/**
 * Apply inverse offset: convert Speckle position → CAD position
 */
export function speckleToCad(
  pos: { x: number; y: number; z: number },
  target: { x: number; y: number; z: number },
  offset: CoordinateOffset
): {
  position: { x: number; y: number; z: number }
  target: { x: number; y: number; z: number }
} {
  const s = offset.scale || 1
  return {
    position: {
      x: (pos.x - offset.dx) / s,
      y: (pos.y - offset.dy) / s,
      z: (pos.z - offset.dz) / s
    },
    target: {
      x: (target.x - offset.dx) / s,
      y: (target.y - offset.dy) / s,
      z: (target.z - offset.dz) / s
    }
  }
}

/**
 * Calculate offset from two corresponding 3D points (CAD → Speckle).
 * Also infers scale from distance ratio.
 */
export function calcOffsetFromPoints(
  cadPoint: Vector3,
  specklePoint: Vector3,
  scale = 1
): CoordinateOffset {
  return {
    dx: specklePoint.x - cadPoint.x * scale,
    dy: specklePoint.y - cadPoint.y * scale,
    dz: specklePoint.z - cadPoint.z * scale,
    scale
  }
}
