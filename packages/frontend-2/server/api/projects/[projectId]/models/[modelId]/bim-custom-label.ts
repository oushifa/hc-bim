import {
  createError,
  defineEventHandler,
  getHeader,
  getRouterParam,
  parseCookies
} from 'h3'
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
    applicationId?: string
    elementId?: string
    parameters: Record<string, FlatValue>
  }>
}

type SourceFileType = 'ifc' | 'rvt' | null

const TREE_CHILD_KEYS = ['elements', 'children', '@elements', '@children', 'objects']

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const pickIdString = (...values: unknown[]): string | undefined => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length) return value
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
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

const inferSourceFileType = (modelName: string): SourceFileType => {
  const lower = modelName.trim().toLowerCase()
  if (lower.endsWith('.ifc')) return 'ifc'
  if (lower.endsWith('.rvt')) return 'rvt'
  return null
}

const getSyncElementIds = (
  raw: Record<string, unknown>,
  _sourceFileType?: SourceFileType
): { id?: string; applicationId?: string; elementId?: string } => {
  const applicationId = pickIdString(raw.applicationId, raw.originalId, raw.originalID)
  const elementId = pickIdString(raw.elementId, raw.elementID)

  return {
    id: elementId || applicationId,
    applicationId: applicationId || undefined,
    elementId: elementId || undefined
  }
}

const buildSyncFlatPayload = (params: {
  modelSeedId: string
  modelName: string
  versionCreatedAt: string
  rootId: string
  objectMap: Map<string, SyncObjectLite>
}): SyncFlatPayload => {
  const reachableIds = collectReachableIds(params.rootId, params.objectMap)
  const sourceFileType = inferSourceFileType(params.modelName)
  const dedupedElements = new Map<
    string,
    { applicationId?: string; elementId?: string }
  >()

  for (const id of reachableIds) {
    if (id === params.rootId) continue
    const item = params.objectMap.get(id)
    if (!item) continue

    const ids = getSyncElementIds(item.raw, sourceFileType)
    if (!ids.id) continue
    if (!dedupedElements.has(ids.id)) {
      dedupedElements.set(ids.id, {
        ...(ids.applicationId ? { applicationId: ids.applicationId } : {}),
        ...(ids.elementId ? { elementId: ids.elementId } : {})
      })
    }
  }

  return {
    model: {
      id: params.modelSeedId,
      name: params.modelName,
      timestamp: params.versionCreatedAt
    },
    elements: [...dedupedElements.entries()].map(([id, meta]) => ({
      id,
      ...(meta.applicationId ? { applicationId: meta.applicationId } : {}),
      ...(meta.elementId ? { elementId: meta.elementId } : {}),
      parameters: {}
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

  const cookies = parseCookies(event)
  const authHeader = getHeader(event, 'authorization')
  const authHeaderToken = authHeader?.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length).trim()
    : undefined
  const authToken = cookies[CookieKeys.AuthToken] || authHeaderToken
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
