import { describe, expect, it } from 'vitest'
import { Texture } from 'three'
import Materials, { type BlobResourceContext } from '../src/modules/materials/Materials.js'
import SpeckleStandardMaterial from '../src/modules/materials/SpeckleStandardMaterial.js'
import { TreeNode } from '../src/modules/tree/WorldTree.js'
import { NodeRenderView } from '../src/modules/tree/NodeRenderView.js'
import { GeometryType } from '../src/modules/batching/Batch.js'
import { SpeckleType } from '../src/modules/loaders/GeometryConverter.js'
import { ChunkArray } from '../src/modules/converter/VirtualArray.js'

describe('Diffuse texture support', () => {
  const blobContext: BlobResourceContext = {
    serverUrl: 'https://app.speckle.systems',
    streamId: 'stream-123',
    authToken: 'token-abc'
  }

  const makeMaterialNode = (blobId?: string): TreeNode =>
    ({
      model: {
        id: 'mat-node',
        raw: {
          renderMaterial: {
            id: 'mat-1',
            diffuse: -1,
            emissive: 0,
            opacity: 1,
            roughness: 0.8,
            metalness: 0,
            ...(blobId
              ? {
                  diffuseTexture: {
                    blobId,
                    mimeType: 'image/jpeg',
                    fileName: 'Sycamore5.jpg'
                  }
                }
              : {})
          }
        }
      }
    } as unknown as TreeNode)

  const makeGeometryNode = (hasUV: boolean): TreeNode =>
    ({
      model: {
        id: 'geom-node',
        raw: {
          ...(hasUV ? { textureCoordinates: [0, 0, 1, 0, 0, 1] } : {})
        }
      }
    } as unknown as TreeNode)

  it('populates diffuseTexture URL and authToken from BlobResourceContext', () => {
    const matNode = makeMaterialNode('blob-999')
    const geomNode = makeGeometryNode(true)

    const renderMat = Materials.renderMaterialFromNode(matNode, geomNode, blobContext)
    expect(renderMat).not.toBeNull()
    expect(renderMat?.diffuseTexture).toEqual({
      blobId: 'blob-999',
      url: 'https://app.speckle.systems/api/stream/stream-123/blob/blob-999',
      mimeType: 'image/jpeg',
      authToken: 'token-abc'
    })
  })

  it('produces distinct material hashes for different diffuseTexture blobIds and UV presence', () => {
    const geomNode = makeGeometryNode(true)
    const makeRenderView = (blobId: string | undefined, hasUV: boolean) => {
      const matNode = makeMaterialNode(blobId)
      const renderMaterial = Materials.renderMaterialFromNode(
        matNode,
        geomNode,
        blobContext
      )
      return new NodeRenderView({
        id: 'rv-1',
        subtreeId: 0,
        speckleType: SpeckleType.Mesh,
        geometry: {
          attributes: {
            POSITION: new ChunkArray([{ data: [0, 0, 0, 1, 0, 0, 0, 1, 0], id: 'p', references: 1 }]),
            INDEX: new ChunkArray([{ data: [0, 1, 2], id: 'i', references: 1 }]),
            ...(hasUV
              ? {
                  UV: new ChunkArray([{ data: [0, 0, 1, 0, 0, 1], id: 'u', references: 1 }])
                }
              : {})
          },
          bakeTransform: null,
          transform: null
        },
        renderMaterial,
        displayStyle: null,
        colorMaterial: null
      })
    }

    const rvTexA = makeRenderView('blob-A', true)
    const rvTexB = makeRenderView('blob-B', true)
    const rvNoUV = makeRenderView('blob-A', false)

    expect(rvTexA.geometryType).toBe(GeometryType.MESH)
    expect(rvTexA.renderMaterialHash).not.toBe(rvTexB.renderMaterialHash)
    expect(rvTexA.renderMaterialHash).not.toBe(rvNoUV.renderMaterialHash)
  })

  it('copies map and alphaTest in SpeckleStandardMaterial.fastCopy and marks needsUpdate', () => {
    const src = new SpeckleStandardMaterial({ color: 0xffffff })
    const dst = new SpeckleStandardMaterial({ color: 0xcccccc })
    const tex = new Texture()
    src.map = tex
    src.alphaTest = 0.5
    const prevVersion = dst.version

    dst.fastCopy(src, dst)

    expect(dst.map).toBe(tex)
    expect(dst.alphaTest).toBe(0.5)
    expect(dst.version).toBeGreaterThan(prevVersion)
  })
})
