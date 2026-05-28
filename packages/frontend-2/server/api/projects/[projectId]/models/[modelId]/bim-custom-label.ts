import { createError, defineEventHandler, getRouterParam, parseCookies } from 'h3'
import { CookieKeys } from '~/lib/common/helpers/constants'
import { useApiOrigin } from '~/composables/env'

type FlatValue = string | number | boolean | null

type SyncLatestVersionResponse = {
  data?: {
    project?: {
      model?: {
        id: string
        name?: string | null
        versions?: {
          items?: Array<{
            id: string
            createdAt: string
            referencedObject?: string | null
            seedId?: string | null
          }>
        }
      }
    }
  }
  errors?: Array<{ message?: string }>
}

type SyncObjectLite = {
  id: string
  childrenIds: string[]
  raw: Record<string, unknown>
}

type SyncFlatPayload = {
  model: {
    id: string
    name: string
    timestamp: string
  }
  elements: Array<{
    id: string
    parameters: Record<string, FlatValue>
  }>
}

type QuantityValue = {
  value: number
  units?: string
}

const TREE_CHILD_KEYS = ['elements', 'children', '@elements', '@children', 'objects']
const UNIT_SYMBOL_MAP: Record<string, string> = {
  'cubic metre': 'm3',
  'square metre': 'm2',
  metre: 'm',
  millimetre: 'mm'
}
const IFC_CATEGORY_MAP: Record<string, string> = {
  IfcWall: 'OST_Walls',
  IfcSlab: 'OST_Floors',
  IfcBeam: 'OST_StructuralFraming',
  IfcColumn: 'OST_StructuralColumns',
  IfcFooting: 'OST_StructuralFoundation',
  IfcSite: 'OST_Site',
  IfcBuilding: 'OST_Buildings',
  IfcBuildingStorey: 'OST_Levels',
  IfcRoof: 'OST_Roofs',
  IfcDoor: 'OST_Doors',
  IfcWindow: 'OST_Windows',
  IfcStair: 'OST_Stairs'
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const pickString = (...values: unknown[]): string | undefined => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length) return value
  }
  return undefined
}

const normalizeParameterValue = (value: unknown): FlatValue | undefined => {
  if (value === null) return null
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value
  }
  return undefined
}

const extractRefIds = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []
  const refs: string[] = []
  for (const item of value) {
    if (isObject(item) && typeof item.referencedId === 'string') {
      refs.push(item.referencedId)
    }
  }
  return refs
}

const objectToSyncLite = (id: string, obj: Record<string, unknown>): SyncObjectLite => {
  const childrenIdsSet = new Set<string>()
  for (const key of TREE_CHILD_KEYS) {
    const refs = extractRefIds(obj[key])
    refs.forEach((refId) => childrenIdsSet.add(refId))
  }

  return {
    id,
    childrenIds: [...childrenIdsSet],
    raw: obj
  }
}

const indexObjectsFromJsonlResponse = async (
  body: ReadableStream<Uint8Array>
): Promise<Map<string, SyncObjectLite>> => {
  const objectMap = new Map<string, SyncObjectLite>()
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  const pushLine = (line: string) => {
    const firstTab = line.indexOf('\t')
    if (firstTab <= 0) return

    const id = line.slice(0, firstTab).trim()
    const jsonPart = line.slice(firstTab + 1)
    if (!id || !jsonPart) return

    try {
      const parsed = JSON.parse(jsonPart) as Record<string, unknown>
      objectMap.set(id, objectToSyncLite(id, parsed))
    } catch {
      // Ignore malformed lines and continue parsing the rest
    }
  }

  while (true) {
    const { done, value } = await reader.read()
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done })

    const lines = buffer.split('\n')
    buffer = lines.pop() || ''
    for (const line of lines) pushLine(line)

    if (done) break
  }

  if (buffer.trim().length) pushLine(buffer)
  return objectMap
}

const collectReachableIds = (
  rootId: string,
  map: Map<string, SyncObjectLite>,
  visited = new Set<string>()
): Set<string> => {
  if (visited.has(rootId)) return visited
  visited.add(rootId)
  const node = map.get(rootId)
  for (const childId of node?.childrenIds || []) {
    collectReachableIds(childId, map, visited)
  }
  return visited
}

const toFlatPrimitiveRecord = (value: unknown): Record<string, FlatValue> => {
  const out: Record<string, FlatValue> = {}
  if (!isObject(value)) return out

  const walk = (input: unknown, parentKey = '') => {
    if (Array.isArray(input)) {
      for (let i = 0; i < input.length; i++) {
        const nextKey = parentKey ? `${parentKey}[${i}]` : `[${i}]`
        walk(input[i], nextKey)
      }
      return
    }

    const primitive = normalizeParameterValue(input)
    if (primitive !== undefined) {
      if (parentKey) out[parentKey] = primitive
      return
    }

    if (!isObject(input)) return
    for (const [key, nestedValue] of Object.entries(input)) {
      const nextKey = parentKey ? `${parentKey}.${key}` : key
      walk(nestedValue, nextKey)
    }
  }

  walk(value)
  return out
}

const pickParametersSource = (raw: Record<string, unknown>) => {
  if (isObject(raw.parameters)) return raw.parameters
  if (isObject(raw.properties)) return raw.properties
  return undefined
}

const formatNumber = (value: number): string => {
  const fixed = value.toFixed(2)
  return fixed.replace(/\.?0+$/, '')
}

const normalizeUnit = (unit: string): string => {
  const normalized = unit.trim().toLowerCase()
  return UNIT_SYMBOL_MAP[normalized] || unit
}

const formatQuantityValue = ({ value, units }: QuantityValue): string => {
  const num = formatNumber(value)
  if (!units || !units.trim().length) return num
  return `${num} ${normalizeUnit(units)}`
}

const collectNamedQuantities = (
  input: unknown,
  out: Map<string, QuantityValue> = new Map<string, QuantityValue>()
): Map<string, QuantityValue> => {
  if (Array.isArray(input)) {
    for (const item of input) collectNamedQuantities(item, out)
    return out
  }
  if (!isObject(input)) return out

  const maybeName = typeof input.name === 'string' ? input.name : undefined
  const maybeValue = typeof input.value === 'number' ? input.value : undefined
  const maybeUnits = typeof input.units === 'string' ? input.units : undefined
  if (maybeName && maybeValue !== undefined) {
    out.set(maybeName, { value: maybeValue, units: maybeUnits })
  }

  for (const value of Object.values(input)) {
    collectNamedQuantities(value, out)
  }
  return out
}

const pickFirstQuantity = (
  quantities: Map<string, QuantityValue>,
  candidates: string[]
): QuantityValue | undefined => {
  for (const key of candidates) {
    const hit = quantities.get(key)
    if (hit) return hit
  }
  return undefined
}

const extractReference = (
  properties: Record<string, unknown> | undefined
): string | undefined => {
  if (!properties || !isObject(properties['Property Sets'])) return undefined
  const propertySets = properties['Property Sets']
  for (const value of Object.values(propertySets)) {
    if (!isObject(value)) continue
    if (typeof value.Reference === 'string' && value.Reference.trim().length) {
      return value.Reference
    }
  }
  return undefined
}

const setQuantityField = (
  out: Record<string, FlatValue>,
  label: string,
  quantities: Map<string, QuantityValue>,
  candidates: string[]
) => {
  const found = pickFirstQuantity(quantities, candidates)
  if (found) out[label] = formatQuantityValue(found)
}

const buildDisplayParameters = (
  raw: Record<string, unknown>
): Record<string, FlatValue> => {
  const out: Record<string, FlatValue> = {}

  const properties = isObject(raw.properties) ? raw.properties : undefined
  const attributes = isObject(properties?.Attributes)
    ? properties.Attributes
    : undefined
  const quantities = collectNamedQuantities(
    isObject(properties?.Quantities) ? properties.Quantities : {}
  )

  const type = pickString(attributes?.type, raw.ifcType)
  if (type) out.Type = type

  const typeName = pickString(attributes?.ObjectType)
  if (typeName) out.TypeName = typeName

  const categoryCandidate =
    (typeof attributes?.Category === 'string' && attributes.Category) ||
    (typeof raw.category === 'string' && raw.category) ||
    (type && IFC_CATEGORY_MAP[type]) ||
    type
  if (categoryCandidate) out.Category = categoryCandidate

  const storey = pickString(properties?.['Building Storey'])
  if (storey) out.Storey = storey

  const reference = extractReference(properties)
  if (reference) out.Reference = reference

  setQuantityField(out, 'Volume', quantities, ['NetVolume', 'GrossVolume', 'Volume'])
  setQuantityField(out, 'Area', quantities, [
    'NetSurfaceArea',
    'GrossSurfaceArea',
    'Area',
    'NetArea',
    'GrossArea',
    'NetSideArea',
    'GrossSideArea',
    'CrossSectionArea',
    'OuterSurfaceArea'
  ])
  setQuantityField(out, 'Length', quantities, ['Length'])
  setQuantityField(out, 'Width', quantities, ['Width'])
  setQuantityField(out, 'Height', quantities, ['Height'])

  return out
}

const getSyncElementId = (raw: Record<string, unknown>) => {
  return pickString(raw.applicationId, raw.originalId, raw.originalID)
}

const buildSyncFlatPayload = (params: {
  modelSeedId: string
  modelName: string
  versionCreatedAt: string
  rootId: string
  objectMap: Map<string, SyncObjectLite>
}): SyncFlatPayload => {
  const reachableIds = collectReachableIds(params.rootId, params.objectMap)
  const dedupedElements = new Map<string, Record<string, FlatValue>>()

  for (const id of reachableIds) {
    if (id === params.rootId) continue
    const item = params.objectMap.get(id)
    if (!item) continue

    const elementId = getSyncElementId(item.raw)
    if (!elementId) continue

    const source = pickParametersSource(item.raw)
    const displayParameters = buildDisplayParameters(item.raw)
    const rawParameters = Object.keys(displayParameters).length
      ? displayParameters
      : toFlatPrimitiveRecord(source)
    const parameters = Object.keys(rawParameters).length ? rawParameters : {}

    const existing = dedupedElements.get(elementId)
    if (!existing) {
      dedupedElements.set(elementId, { ...parameters })
      continue
    }

    for (const [key, value] of Object.entries(parameters)) {
      const hasCurrent = Object.prototype.hasOwnProperty.call(existing, key)
      if (!hasCurrent || existing[key] === null || existing[key] === '') {
        existing[key] = value
      }
    }
  }

  return {
    model: {
      id: params.modelSeedId,
      name: params.modelName,
      timestamp: params.versionCreatedAt
    },
    elements: [...dedupedElements.entries()].map(([id, parameters]) => ({
      id,
      parameters
    }))
  }
}

export default defineEventHandler(async (event) => {
  const projectId = getRouterParam(event, 'projectId')
  const modelId = getRouterParam(event, 'modelId')
  if (!projectId || !modelId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing projectId or modelId'
    })
  }

  const authToken = parseCookies(event)[CookieKeys.AuthToken]
  if (!authToken) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Not authenticated',
      message: '您未登录到此服务器'
    })
  }

  const apiOrigin = useApiOrigin()
  const cookieHeader = event.node.req.headers.cookie
  const requestHeaders: Record<string, string> = {
    Authorization: `Bearer ${authToken}`
  }
  if (cookieHeader) requestHeaders['Cookie'] = cookieHeader

  let graphQlBody: SyncLatestVersionResponse
  try {
    graphQlBody = await $fetch<SyncLatestVersionResponse>(`${apiOrigin}/graphql`, {
      method: 'POST',
      headers: {
        ...requestHeaders,
        'Content-Type': 'application/json'
      },
      body: {
        query: `
          query WorkbenchSyncModelLatestVersion($projectId: String!, $modelId: String!) {
            project(id: $projectId) {
              id
              model(id: $modelId) {
                id
                name
                versions(limit: 1) {
                  items {
                    id
                    createdAt
                    referencedObject
                    seedId
                  }
                }
              }
            }
          }
        `,
        variables: {
          projectId,
          modelId
        }
      }
    })
  } catch (error) {
    const err = error as {
      statusCode?: number
      statusMessage?: string
      message?: string
      data?: unknown
    }
    throw createError({
      statusCode: typeof err.statusCode === 'number' ? err.statusCode : 500,
      statusMessage: err.statusMessage || 'GraphQL request failed',
      message:
        typeof err.data === 'string'
          ? err.data
          : err.message || 'GraphQL request failed'
    })
  }
  if (graphQlBody.errors?.length) {
    throw createError({
      statusCode: 500,
      statusMessage: 'GraphQL returned errors',
      message: graphQlBody.errors
        .map((item) => item.message || 'Unknown error')
        .join('; ')
    })
  }

  const latestVersion = graphQlBody.data?.project?.model?.versions?.items?.[0]
  if (!latestVersion?.referencedObject) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Referenced object not found',
      message: '未找到模型最新版本的 referencedObject'
    })
  }
  const modelSeedId = latestVersion.seedId?.trim() || ''

  let objectsStream: ReadableStream<Uint8Array>
  try {
    objectsStream = await $fetch<ReadableStream<Uint8Array>>(
      `${apiOrigin}/objects/${projectId}/${latestVersion.referencedObject}`,
      {
        method: 'GET',
        headers: {
          ...requestHeaders,
          Accept: 'text/plain'
        },
        responseType: 'stream'
      }
    )
  } catch (error) {
    const err = error as {
      statusCode?: number
      statusMessage?: string
      message?: string
      data?: unknown
    }
    throw createError({
      statusCode: typeof err.statusCode === 'number' ? err.statusCode : 500,
      statusMessage: 'Object download failed',
      message:
        typeof err.data === 'string'
          ? err.data
          : err.message || 'Object download failed'
    })
  }

  const objectMap = await indexObjectsFromJsonlResponse(objectsStream)
  const payload = buildSyncFlatPayload({
    modelSeedId,
    modelName: graphQlBody.data?.project?.model?.name || modelId,
    versionCreatedAt: latestVersion.createdAt,
    rootId: latestVersion.referencedObject,
    objectMap
  })

  return {
    fileName: `model-${modelId}-custom-labels.json`,
    payload
  }
})
