import { afterAll, beforeAll, describe, expect, it } from 'vitest'

type ResponseSummary = {
  status: number
  statusText: string
  url: string
  bodyText: string
}

type GraphQlEnvelope<TData> = {
  data?: TData
  errors?: Array<{ message?: string }>
}

const TEST_BASE_URL =
  process.env.DTP_TEST_BASE_URL?.trim() || 'http://120.133.226.216:3300'
const TEST_USERNAME = process.env.DTP_TEST_USERNAME?.trim() || ''
const TEST_PASSWORD = process.env.DTP_TEST_PASSWORD || ''

const runSummaries: string[] = []
let authToken = ''
let testProjectId = ''
let testModelId = ''

const challenge = () => Math.random().toString(36).slice(2, 12)

const toUrl = (path: string) => new URL(path, TEST_BASE_URL).toString()

const sanitizeText = (value: string) =>
  value
    .replace(/access_code=[^&\s"]+/g, 'access_code=[redacted]')
    .replace(/"token":"[^"]+"/g, '"token":"[redacted]"')
    .replace(/"refreshToken":"[^"]+"/g, '"refreshToken":"[redacted]"')

const requestJson = async (
  path: string,
  init?: RequestInit
): Promise<ResponseSummary> => {
  const response = await fetch(toUrl(path), {
    redirect: 'follow',
    ...init
  })

  const bodyText = await response.text()

  return {
    status: response.status,
    statusText: response.statusText,
    url: response.url,
    bodyText
  }
}

const shortBody = (bodyText: string) =>
  sanitizeText(bodyText).replace(/\s+/g, ' ').slice(0, 180)

const appendSummary = (title: string, summary: ResponseSummary) => {
  runSummaries.push(
    `${title}: ${summary.status} ${summary.statusText} ${sanitizeText(
      summary.url
    )} ${shortBody(summary.bodyText)}`
  )
}

const requestGraphQl = async <TData>(
  body: {
    operationName: string
    query: string
    variables?: Record<string, unknown>
  },
  options?: {
    token?: string
  }
) => {
  const summary = await requestJson('/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-apollo-operation-name': body.operationName,
      ...(options?.token ? { Authorization: `Bearer ${options.token}` } : {})
    },
    body: JSON.stringify(body)
  })

  expect(summary.status).toBe(200)

  const payload = JSON.parse(summary.bodyText) as GraphQlEnvelope<TData>
  expect(payload.errors, summary.bodyText).toBeUndefined()

  return {
    summary,
    payload
  }
}

const resolveAccessCode = (summary: ResponseSummary) => {
  if (!summary.url.includes('access_code=')) {
    throw new Error(
      `未从登录响应中解析到 access_code: ${summary.status} ${shortBody(
        summary.bodyText
      )}`
    )
  }

  const accessCode = new URL(summary.url).searchParams.get('access_code')
  if (!accessCode) {
    throw new Error('登录重定向存在，但 access_code 为空')
  }

  return accessCode
}

describe('基础接口可用性测试', () => {
  beforeAll(() => {
    expect(TEST_USERNAME, '缺少 DTP_TEST_USERNAME 环境变量').not.toBe('')
    expect(TEST_PASSWORD, '缺少 DTP_TEST_PASSWORD 环境变量').not.toBe('')
  })

  afterAll(() => {
    if (!runSummaries.length) return
    // 帮助直接在测试输出中查看最终结果
    process.stdout.write('\n[API Test Summary]\n')
    for (const line of runSummaries) {
      process.stdout.write(`${line}\n`)
    }
  })

  it('健康检查接口可用', async () => {
    const summary = await requestJson('/health', {
      method: 'GET'
    })

    appendSummary('Health', summary)

    expect(summary.status).toBe(200)
    expect(summary.bodyText.trim().toLowerCase()).toBe('ok')
  })

  it('API 状态接口可用', async () => {
    const summary = await requestJson('/api/status', {
      method: 'GET'
    })

    appendSummary('API status', summary)
    expect(summary.status).toBe(200)

    const payload = JSON.parse(summary.bodyText) as {
      status?: string
      redisConnected?: boolean
    }

    expect(payload.status).toBe('ok')
    expect(typeof payload.redisConnected).toBe('boolean')
  })

  it('GraphQL 公共 serverInfo 查询可用', async () => {
    const { summary, payload } = await requestGraphQl<{
      serverInfo?: {
        name?: string | null
        canonicalUrl?: string | null
      } | null
    }>({
      operationName: 'ApiAvailabilityServerInfo',
      query: 'query ApiAvailabilityServerInfo { serverInfo { name canonicalUrl } }'
    })

    appendSummary('GraphQL serverInfo', summary)
    expect(payload.data?.serverInfo?.canonicalUrl).toBeTruthy()
  })

  it('前端登录链路可用并可获取 activeUser', async () => {
    const currentChallenge = challenge()
    const loginSummary = await requestJson(
      `/auth/local/login?challenge=${encodeURIComponent(
        currentChallenge
      )}&frontendOrigin=${encodeURIComponent(TEST_BASE_URL)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Frontend-Origin': TEST_BASE_URL
        },
        body: JSON.stringify({
          email: TEST_USERNAME,
          password: TEST_PASSWORD
        })
      }
    )

    appendSummary('Frontend login', loginSummary)
    expect(loginSummary.status).toBe(200)

    const accessCode = resolveAccessCode(loginSummary)

    const tokenSummary = await requestJson('/auth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        accessCode,
        appId: 'spklwebapp',
        appSecret: 'spklwebapp',
        challenge: currentChallenge
      })
    })

    appendSummary('Auth token', tokenSummary)
    expect(tokenSummary.status).toBe(200)

    const tokenPayload = JSON.parse(tokenSummary.bodyText) as {
      token?: string
    }
    expect(
      tokenPayload.token,
      `auth/token 未返回 token: ${tokenSummary.bodyText}`
    ).toBeTruthy()
    authToken = tokenPayload.token || ''

    const { summary: graphQlSummary, payload: graphQlPayload } = await requestGraphQl<{
      activeUser?: {
        id?: string
        email?: string | null
        name?: string | null
      } | null
    }>(
      {
        operationName: 'ApiAvailabilityActiveUser',
        query: 'query ApiAvailabilityActiveUser { activeUser { id email name } }'
      },
      { token: authToken }
    )

    appendSummary('GraphQL activeUser', graphQlSummary)
    expect(graphQlPayload.data?.activeUser?.id, graphQlSummary.bodyText).toBeTruthy()
  })

  it('可自动发现一个带模型的测试项目', async () => {
    const { summary, payload } = await requestGraphQl<{
      activeUser?: {
        id?: string
        projects?: {
          items?: Array<{
            id?: string | null
            name?: string | null
            models?: {
              totalCount?: number | null
              items?: Array<{ id?: string | null; name?: string | null } | null> | null
            } | null
          } | null> | null
        } | null
      } | null
    }>(
      {
        operationName: 'ApiAvailabilityDiscoverProject',
        query:
          'query ApiAvailabilityDiscoverProject { activeUser { id projects(limit: 10) { items { id name models(limit: 1) { totalCount items { id name } } } } } }'
      },
      { token: authToken }
    )

    appendSummary('GraphQL discover project', summary)

    const projects = payload.data?.activeUser?.projects?.items || []
    const projectWithModel = projects.find(
      (project) => (project?.models?.items?.[0]?.id || '').length > 0
    )

    expect(
      projectWithModel?.id,
      '当前账号下未发现可用于接口测试的项目/模型'
    ).toBeTruthy()
    expect(projectWithModel?.models?.items?.[0]?.id).toBeTruthy()

    testProjectId = projectWithModel?.id || ''
    testModelId = projectWithModel?.models?.items?.[0]?.id || ''
  })

  it('Viewer 目录查询接口可用', async () => {
    expect(testProjectId, '缺少测试 projectId').toBeTruthy()
    expect(testModelId, '缺少测试 modelId').toBeTruthy()

    const summary = await requestJson(
      `/api/projects/${testProjectId}/viewer-catalogs?modelId=${encodeURIComponent(
        testModelId
      )}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      }
    )

    appendSummary('Viewer catalogs', summary)
    expect(summary.status).toBe(200)

    const payload = JSON.parse(summary.bodyText) as {
      data?: unknown[]
    }
    expect(Array.isArray(payload.data)).toBe(true)
  })

  it('Viewer 对象自定义属性查询接口可用', async () => {
    expect(testProjectId, '缺少测试 projectId').toBeTruthy()
    expect(testModelId, '缺少测试 modelId').toBeTruthy()

    const summary = await requestJson(
      `/api/projects/${testProjectId}/viewer-object-custom-attributes?modelId=${encodeURIComponent(
        testModelId
      )}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      }
    )

    appendSummary('Viewer object custom attributes', summary)
    expect(summary.status).toBe(200)

    const payload = JSON.parse(summary.bodyText) as {
      data?: unknown[]
    }
    expect(Array.isArray(payload.data)).toBe(true)
  })

  it('BIM 自定义标签导出接口可用', async () => {
    expect(testProjectId, '缺少测试 projectId').toBeTruthy()
    expect(testModelId, '缺少测试 modelId').toBeTruthy()

    const summary = await requestJson(
      `/api/v1/projects/${testProjectId}/models/${testModelId}/bim-custom-label`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      }
    )

    appendSummary('BIM custom label', summary)
    expect([200, 400]).toContain(summary.status)

    const payload = JSON.parse(summary.bodyText) as {
      fileName?: string
      payload?: {
        model?: {
          id?: string
        }
        elements?: unknown[]
      }
      error?: string
    }

    if (summary.status === 200) {
      expect(payload.fileName).toBeTruthy()
      expect(payload.payload?.model?.id).toBeTruthy()
      return
    }

    expect(payload.error).toContain('Latest version seedId missing')
  })
})
