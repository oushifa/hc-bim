import DxfParser from 'dxf-parser'
import {
  Group,
  BufferGeometry,
  Float32BufferAttribute,
  LineBasicMaterial,
  LineSegments,
  MeshBasicMaterial,
  PlaneGeometry,
  Mesh,
  CanvasTexture,
  LinearFilter,
  DoubleSide,
  Color,
  Vector3,
  Matrix4
} from 'three'
import type { Object3D } from 'three'

/** ACI (AutoCAD Color Index) standard 256-color palette */
const ACI_COLORS: number[] = [
  0xffffff, 0xff0000, 0xffff00, 0x00ff00, 0x00ffff, 0x0000ff, 0xff00ff, 0xffffff, 0x808080, 0xc0c0c0,
  0xff0000, 0xff3f3f, 0xff7f7f, 0xffbfbf, 0xffdfdf, 0xbf0000, 0xbf2f2f, 0xbf5f5f, 0xbf8f8f, 0xbfafaf,
  0x7f0000, 0x7f1f1f, 0x7f3f3f, 0x7f5f5f, 0x7f7f7f, 0x3f0000, 0x3f0f0f, 0x3f1f1f, 0x3f2f2f, 0x3f3f3f,
  0xff3f00, 0xff5f00, 0xff7f00, 0xff9f00, 0xffbf00, 0xbf2f00, 0xbf4700, 0xbf5f00, 0xbf7700, 0xbf8f00,
  0x7f1f00, 0x7f2f00, 0x7f3f00, 0x7f4f00, 0x7f5f00, 0x3f0f00, 0x3f1700, 0x3f1f00, 0x3f2700, 0x3f2f00,
  0xff7f00, 0xff9f00, 0xffbf00, 0xffdf00, 0xffff00, 0xbf5f00, 0xbf7700, 0xbf8f00, 0xbfa700, 0xbfbf00,
  0x7f3f00, 0x7f4f00, 0x7f5f00, 0x7f6f00, 0x7f7f00, 0x3f1f00, 0x3f2700, 0x3f2f00, 0x3f3700, 0x3f3f00,
  0xbfff00, 0x7fff00, 0x3fff00, 0x00ff00, 0x00ff3f, 0x8fbf00, 0x5fbf00, 0x2fbf00, 0x00bf00, 0x00bf2f,
  0x5f7f00, 0x3f7f00, 0x1f7f00, 0x007f00, 0x007f1f, 0x2f3f00, 0x1f3f00, 0x0f3f00, 0x003f00, 0x003f0f,
  0x00ff7f, 0x00ffbf, 0x00ffff, 0x00bfff, 0x007fff, 0x00bf5f, 0x00bf8f, 0x00bfbf, 0x008fbf, 0x005fbf,
  0x007f3f, 0x007f5f, 0x007f7f, 0x005f7f, 0x003f7f, 0x003f1f, 0x003f2f, 0x003f3f, 0x002f3f, 0x001f3f,
  0x003fff, 0x0000ff, 0x3f00ff, 0x7f00ff, 0xbf00ff, 0x002fbf, 0x0000bf, 0x2f00bf, 0x5f00bf, 0x8f00bf,
  0x001f7f, 0x00007f, 0x1f007f, 0x3f007f, 0x5f007f, 0x000f3f, 0x00003f, 0x0f003f, 0x1f003f, 0x2f003f,
  0xff00ff, 0xff00bf, 0xff007f, 0xff003f, 0xff0000, 0xbf00bf, 0xbf008f, 0xbf005f, 0xbf002f, 0xbf0000,
  0x7f007f, 0x7f005f, 0x7f003f, 0x7f001f, 0x7f0000, 0x3f003f, 0x3f002f, 0x3f001f, 0x3f000f, 0x3f0000,
  0xff3f3f, 0xff3f00, 0xff3f7f, 0xff3fbf, 0xff3fff, 0xbf2f2f, 0xbf2f00, 0xbf2f5f, 0xbf2f8f, 0xbf2fbf,
  0x7f1f1f, 0x7f1f00, 0x7f1f3f, 0x7f1f5f, 0x7f1f7f, 0x3f0f0f, 0x3f0f00, 0x3f0f1f, 0x3f0f2f, 0x3f0f3f,
  0xff7f3f, 0xff7f00, 0xff7f7f, 0xff7fbf, 0xff7fff, 0xbf5f2f, 0xbf5f00, 0xbf5f5f, 0xbf5f8f, 0xbf5fbf,
  0x7f3f1f, 0x7f3f00, 0x7f3f3f, 0x7f3f5f, 0x7f3f7f, 0x3f1f0f, 0x3f1f00, 0x3f1f1f, 0x3f1f2f, 0x3f1f3f,
  0xffbf3f, 0xffbf00, 0xffbf7f, 0xffbfbf, 0xffbfff, 0xbf8f2f, 0xbf8f00, 0xbf8f5f, 0xbf8f8f, 0xbf8fbf,
  0x7f5f1f, 0x7f5f00, 0x7f5f3f, 0x7f5f5f, 0x7f5f7f, 0x3f2f0f, 0x3f2f00, 0x3f2f1f, 0x3f2f2f, 0x3f2f3f,
  0xffff3f, 0xffff00, 0xffff7f, 0xffffbf, 0xffffff, 0xbfbf2f, 0xbfbf00, 0xbfbf5f, 0xbfbf8f, 0xbfbfbf,
  0x7f7f1f, 0x7f7f00, 0x7f7f3f, 0x7f7f5f, 0x7f7f7f, 0x3f3f0f, 0x3f3f00, 0x3f3f1f, 0x3f3f2f, 0x3f3f3f,
  0x333333, 0x505050, 0x696969, 0x828282, 0xb4b4b4, 0xffffff
]

function ensureContrastOnWhite(colorHex: number): number {
  const color = new Color(colorHex)
  const r = ((colorHex >> 16) & 255) / 255
  const g = ((colorHex >> 8) & 255) / 255
  const b = (colorHex & 255) / 255
  const toLinear = (c: number) =>
    c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  const luminance =
    0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
  const contrastRatio = 1.05 / (luminance + 0.05)
  if (contrastRatio >= 2.4) return colorHex

  const hsl = { h: 0, s: 0, l: 0 }
  color.getHSL(hsl)
  if (hsl.s <= 0.08) return 0x111827

  const adjusted = new Color().setHSL(hsl.h, Math.min(1, hsl.s * 1.05), 0.3)
  return adjusted.getHex()
}

function getAciColor(colorIndex: number | undefined | null): number {
  if (typeof colorIndex !== 'number') return 0xffffff
  if (colorIndex > 255) return colorIndex // Might be a raw hex
  return ACI_COLORS[colorIndex] ?? 0xffffff
}

function cleanMtext(text: string): string {
  return text
    .replace(/\\[ACFHQTWacfhqtw][^;]*;/g, '')
    .replace(/\\[LOloKk]/g, '')
    .replace(/\\P/g, '\n')
    .replace(/\^I/g, '    ')
    .replace(/[{}]/g, '')
    .replace(/%%c/gi, 'ø')
    .replace(/%%d/gi, '°')
    .replace(/%%p/gi, '±')
    .replace(/\\\\/g, '\\')
    .trim()
}

interface TextItem {
  entity: any
  matrix: Matrix4
  color: number
}

/**
 * DXF → Three.js group loader.
 * Ported from reality-check-app/src/potree-loaders/DxfLoader.js,
 * adapted to use named ESM imports instead of window.THREE.
 */
export function parseDxfToGroup(text: string): Object3D {
  const parser = new DxfParser()
  const dxf = parser.parseSync(text)
  if (!dxf) throw new Error('DXF parse failed')

  const group = new Group()
  const colorBuffers = new Map<number, number[]>()
  const textItems: TextItem[] = []
  const blocks: Record<string, any> = dxf.blocks || {}

  const addSegment = (p1: Vector3, p2: Vector3, color: number) => {
    if (!colorBuffers.has(color)) colorBuffers.set(color, [])
    const buf = colorBuffers.get(color)!
    buf.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z)
  }

  const traverse = (entities: any[], mat: Matrix4, parentLayer: string) => {
    for (const e of entities) {
      const layerName = e.layer || parentLayer
      let colorNum = e.color
      if (colorNum === undefined || colorNum === null || colorNum === 256) {
        const layerDef = dxf.tables?.layer?.layers?.[layerName]
        colorNum = layerDef?.color
      }
      const color = ensureContrastOnWhite(getAciColor(colorNum))

      switch (e.type) {
        case 'LINE': {
          if (e.vertices?.length >= 2) {
            const p1 = new Vector3(e.vertices[0].x, e.vertices[0].y, e.vertices[0].z || 0).applyMatrix4(mat)
            const p2 = new Vector3(e.vertices[1].x, e.vertices[1].y, e.vertices[1].z || 0).applyMatrix4(mat)
            addSegment(p1, p2, color)
          }
          break
        }
        case 'LWPOLYLINE':
        case 'lwpolyline':
        case 'POLYLINE': {
          if (e.vertices?.length >= 2) {
            const closed = e.shape === true || (e.flags & 1) === 1
            for (let i = 0; i < e.vertices.length - 1; i++) {
              const p1 = new Vector3(e.vertices[i].x, e.vertices[i].y, e.vertices[i].z || 0).applyMatrix4(mat)
              const p2 = new Vector3(e.vertices[i + 1].x, e.vertices[i + 1].y, e.vertices[i + 1].z || 0).applyMatrix4(mat)
              addSegment(p1, p2, color)
            }
            if (closed) {
              const last = e.vertices[e.vertices.length - 1]
              const first = e.vertices[0]
              const p1 = new Vector3(last.x, last.y, last.z || 0).applyMatrix4(mat)
              const p2 = new Vector3(first.x, first.y, first.z || 0).applyMatrix4(mat)
              addSegment(p1, p2, color)
            }
          }
          break
        }
        case 'CIRCLE':
        case 'ARC': {
          const startAngle = e.startAngle || 0
          let endAngle = e.endAngle !== undefined ? e.endAngle : 2 * Math.PI
          if (startAngle > endAngle) endAngle += 2 * Math.PI
          const r = e.radius
          if (!r) break
          const c = e.center || { x: 0, y: 0, z: 0 }
          const segs = 32
          const step = (endAngle - startAngle) / segs
          let angle = startAngle
          let lastP = new Vector3(c.x + Math.cos(angle) * r, c.y + Math.sin(angle) * r, c.z || 0).applyMatrix4(mat)
          for (let i = 0; i < segs; i++) {
            angle += step
            const nextP = new Vector3(c.x + Math.cos(angle) * r, c.y + Math.sin(angle) * r, c.z || 0).applyMatrix4(mat)
            addSegment(lastP, nextP, color)
            lastP = nextP
          }
          break
        }
        case 'INSERT': {
          if (!e.name || !blocks[e.name]) break
          const block = blocks[e.name]
          if (!block.entities) break
          const bm = new Matrix4()
          bm.setPosition(e.position.x || 0, e.position.y || 0, e.position.z || 0)
          if (e.rotation) {
            const rad = (e.rotation * Math.PI) / 180
            bm.makeRotationZ(rad)
            bm.setPosition(e.position.x || 0, e.position.y || 0, e.position.z || 0)
          }
          const xs = e.xScale ?? 1, ys = e.yScale ?? 1, zs = e.zScale ?? 1
          bm.scale(new Vector3(xs, ys, zs))
          const offsetM = new Matrix4().setPosition(new Vector3(-(block.position?.x || 0), -(block.position?.y || 0), -(block.position?.z || 0)))
          const newMat = mat.clone().multiply(bm).multiply(offsetM)
          traverse(block.entities, newMat, e.layer || layerName)
          break
        }
        case 'TEXT':
        case 'MTEXT':
          textItems.push({ entity: e, matrix: mat.clone(), color })
          break
      }
    }
  }

  if (dxf.entities) {
    traverse(dxf.entities, new Matrix4(), '0')
  }

  // Build LineSegments per color
  for (const [color, verts] of colorBuffers) {
    if (!verts.length) continue
    const geo = new BufferGeometry()
    geo.setAttribute('position', new Float32BufferAttribute(verts, 3))
    const mat2 = new LineBasicMaterial({ color })
    group.add(new LineSegments(geo, mat2))
  }

  // Text entities (cap at 3000 to avoid OOM)
  const cappedText = textItems.slice(0, 3000)
  for (const { entity, matrix, color } of cappedText) {
    const mesh = buildTextMesh(entity, ensureContrastOnWhite(color))
    if (mesh) {
      mesh.updateMatrix()
      mesh.applyMatrix4(matrix)
      group.add(mesh)
    }
  }

  return group
}

function buildTextMesh(entity: any, colorHex: number): Mesh | null {
  const position = entity.startPoint || entity.insertionPoint || entity.position
  if (!position || !entity.text) return null
  const rawText = typeof entity.text === 'string' ? cleanMtext(entity.text) : ''
  if (!rawText) return null

  const height = entity.height || entity.textHeight || 1
  const rotation = ((entity.rotation || 0) * Math.PI) / 180
  const threeColor = new Color(colorHex)
  const cssColor = '#' + threeColor.getHexString()

  const fontSize = 64
  const fontFace = '"Microsoft YaHei", "PingFang SC", SimHei, STHeiti, sans-serif'
  const lineH = fontSize * 1.2
  const lines = rawText.split('\n')

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  ctx.font = `${fontSize}px ${fontFace}`

  let maxW = 0
  for (const l of lines) maxW = Math.max(maxW, ctx.measureText(l).width)
  maxW = Math.ceil(maxW)
  if (maxW === 0) return null

  canvas.width = maxW
  canvas.height = Math.ceil(lineH * lines.length)
  ctx.font = `${fontSize}px ${fontFace}`
  ctx.fillStyle = cssColor
  ctx.textBaseline = 'top'
  lines.forEach((l, i) => ctx.fillText(l, 0, i * lineH))

  const tex = new CanvasTexture(canvas)
  tex.minFilter = LinearFilter
  tex.magFilter = LinearFilter

  const mat = new MeshBasicMaterial({ map: tex, transparent: true, side: DoubleSide, alphaTest: 0.1, color: 0xffffff })
  const aspect = maxW / canvas.height
  const ph = height * lines.length * 1.2
  const pw = ph * aspect
  const geo = new PlaneGeometry(pw, ph)
  geo.translate(pw / 2, ph / 2, 0)

  const mesh = new Mesh(geo, mat)
  mesh.position.set(position.x, position.y, position.z || 0)
  mesh.rotation.z = rotation
  return mesh
}
