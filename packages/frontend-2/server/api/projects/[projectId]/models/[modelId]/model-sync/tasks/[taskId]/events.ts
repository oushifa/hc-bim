import {
  createError,
  defineEventHandler,
  getHeader,
  getRouterParam,
  parseCookies
} from 'h3'
import { CookieKeys } from '~/lib/common/helpers/constants'
import { useApiOrigin, useFrontendOrigin } from '~/composables/env'

const readResponseText = async (response: Response) => {
  try {
    return await response.text()
  } catch {
    return ''
  }
}

export default defineEventHandler(async (event) => {
  const projectId = getRouterParam(event, 'projectId')
  const modelId = getRouterParam(event, 'modelId')
  const taskId = getRouterParam(event, 'taskId')

  if (!projectId || !modelId || !taskId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing projectId, modelId or taskId'
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
      statusMessage: 'Not authenticated'
    })
  }

  const apiOrigin = useApiOrigin()
  const frontendOrigin = useFrontendOrigin()
  const cookieHeader = event.node.req.headers.cookie
  const abortController = new AbortController()

  const upstream = await fetch(
    `${apiOrigin}/api/v1/projects/${projectId}/models/${modelId}/model-sync/tasks/${taskId}/events`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${authToken}`,
        Accept: 'text/event-stream',
        'X-Frontend-Origin': frontendOrigin,
        ...(cookieHeader ? { Cookie: cookieHeader } : {})
      },
      signal: abortController.signal
    }
  )

  if (!upstream.ok || !upstream.body) {
    throw createError({
      statusCode: upstream.status || 502,
      statusMessage: upstream.statusText || 'Failed to open model sync stream',
      message: (await readResponseText(upstream)) || 'Failed to open model sync stream'
    })
  }

  const res = event.node.res
  res.statusCode = 200
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders?.()

  const reader = upstream.body.getReader()

  event.node.req.on('close', () => {
    abortController.abort()
    void reader.cancel()
  })

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      res.write(value)
    }
  } catch (error) {
    if (!(error instanceof Error) || error.name !== 'AbortError') {
      throw error
    }
  }

  res.end()
})
