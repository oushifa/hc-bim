import { useApolloClient } from '@vue/apollo-composable'
import type { OnProjectVersionsUpdateSubscription } from '~/lib/common/generated/gql/graphql'
import {
  latestModelsPaginationQuery,
  latestModelsQuery
} from '~/lib/projects/graphql/queries'
import { ToastNotificationType, useGlobalToast } from '~~/lib/common/composables/toast'
import { useAuthCookie } from '~~/lib/auth/composables/auth'
import { useScopedState } from '~~/lib/common/composables/scopedState'
import { nanoid } from 'nanoid'
import {
  resumableUpload,
  type ResumableUploadBackend,
  type ResumableUploadPart,
  type UploadedPart
} from '~/lib/core/api/resumableUpload'

const LOCAL_UPLOAD_RUNTIME_END = 20
const RVT_CONVERSION_RUNTIME_START = 20
const RVT_CONVERSION_RUNTIME_END = 60

export type WorkbenchUploadSyncTaskStatus =
  | 'waiting_upload'
  | 'speckle_converting'
  | 'syncing_dtp_model'
  | 'syncing_external_ids'
  | 'triggering_model_transform'
  | 'polling_model_transform'
  | 'succeeded'
  | 'failed'

export type WorkbenchUploadSyncTask = {
  id: string
  projectId: string
  modelId: string | null
  fileName: string
  uploadId: string | null
  versionId: string | null
  seedId: string | null
  assetId: string | null
  assetName: string | null
  transformTaskId: string | null
  status: WorkbenchUploadSyncTaskStatus
  progressPercent: number | null
  progressPhase: string | null
  progressMessage: string | null
  error: string | null
  errorCode: string | null
  retriable: boolean
  retryCount: number
  createdAt: string
  updatedAt: string
}

type ServerModelSyncTask = {
  id: string
  projectId: string
  modelId: string
  fileId: string | null
  fileUploadId: string | null
  versionId: string | null
  fileName: string
  fileType: string | null
  fileSize: number | null
  status: WorkbenchUploadSyncTaskStatus
  progressPercent: number | null
  progressPhase: string | null
  progressMessage: string | null
  seedId: string | null
  assetId: string | null
  assetName: string | null
  transformTaskId: string | null
  error: string | null
  errorCode: string | null
  retriable: boolean
  retryCount: number
  createdAt: string
  updatedAt: string
}

type CreateUploadTaskResponse = {
  data: ServerModelSyncTask
  upload?: {
    fileId: string
    uploadId: string
  }
}

const FINAL_STATUSES: WorkbenchUploadSyncTaskStatus[] = ['succeeded', 'failed']
const CLIENT_UPLOAD_ONLY_STATUSES: WorkbenchUploadSyncTaskStatus[] = ['waiting_upload']
const RVT_FILE_NAME_RE = /\.(rvt|skp|nwd|nwc)$/i

export type WorkbenchModelSyncRuntimeProgress = {
  percent: number
  phase: string | null
  message: string | null
}

type VisibleTaskTarget = {
  projectId: string
  modelIds: string[]
}

type ClosableStream = {
  close: () => void
}

type VisibleTaskSubscriptionState = {
  source: ClosableStream
  ownerIds: string[]
}

const useWorkbenchUploadSyncTaskMap = () => {
  return useScopedState('workbenchUploadSyncTaskMap', () =>
    ref<Record<string, WorkbenchUploadSyncTask>>({})
  )
}

const useWorkbenchUploadSyncEventSources = () =>
  useScopedState('workbenchUploadSyncEventSources', () =>
    ref<Record<string, ClosableStream | null>>({})
  )

const useWorkbenchUploadSyncPageEventSources = () =>
  useScopedState('workbenchUploadSyncPageEventSources', () =>
    ref<Record<string, VisibleTaskSubscriptionState | null>>({})
  )

const buildSyncingModelKey = (projectId: string, modelId: string) =>
  `${projectId}:${modelId}`

const buildVisibleTaskSubscriptionKey = (projectId: string, modelIds: string[]) =>
  `${projectId}:${[...modelIds].sort().join(',')}`

const buildVisibleTaskBatchSubscriptionKey = (targets: VisibleTaskTarget[]) =>
  targets
    .map((target) => buildVisibleTaskSubscriptionKey(target.projectId, target.modelIds))
    .sort()
    .join('|')

const clampProgressPercent = (progress: number | null | undefined) => {
  if (typeof progress !== 'number' || Number.isNaN(progress)) return null
  return Math.max(0, Math.min(100, progress))
}

const openSseStream = (params: {
  url: string
  headers?: HeadersInit
  onEvent: (eventName: string, data: string) => void
  onError?: (error?: unknown) => void
}) => {
  const controller = new AbortController()
  let closed = false

  const flushBuffer = (buffer: string) => {
    const events: string[] = []
    let remaining = buffer

    while (true) {
      const separatorIndex = remaining.indexOf('\n\n')
      if (separatorIndex === -1) break
      events.push(remaining.slice(0, separatorIndex))
      remaining = remaining.slice(separatorIndex + 2)
    }

    return { events, remaining }
  }

  const parseRawEvent = (rawEvent: string) => {
    let eventName = 'message'
    const dataLines: string[] = []

    for (const rawLine of rawEvent.split('\n')) {
      const line = rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine
      if (!line || line.startsWith(':')) continue

      if (line.startsWith('event:')) {
        eventName = line.slice(6).trim() || 'message'
        continue
      }

      if (line.startsWith('data:')) {
        dataLines.push(line.slice(5).trim())
      }
    }

    if (!dataLines.length) return null

    return {
      eventName,
      data: dataLines.join('\n')
    }
  }

  const run = async () => {
    try {
      const response = await fetch(params.url, {
        method: 'GET',
        headers: {
          Accept: 'text/event-stream',
          ...(params.headers || {})
        },
        credentials: 'include',
        signal: controller.signal
      })

      if (!response.ok || !response.body) {
        throw new Error(
          `subscribe failed${response.status ? ` (${response.status})` : ''}`
        )
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const { events, remaining } = flushBuffer(buffer)
        buffer = remaining

        for (const rawEvent of events) {
          const parsedEvent = parseRawEvent(rawEvent)
          if (!parsedEvent) continue
          params.onEvent(parsedEvent.eventName, parsedEvent.data)
        }
      }

      buffer += decoder.decode()
      const { events } = flushBuffer(`${buffer}\n\n`)
      for (const rawEvent of events) {
        const parsedEvent = parseRawEvent(rawEvent)
        if (!parsedEvent) continue
        params.onEvent(parsedEvent.eventName, parsedEvent.data)
      }

      if (!closed) {
        params.onError?.(new Error('stream closed'))
      }
    } catch (error) {
      if (closed && error instanceof Error && error.name === 'AbortError') return
      if (closed) return
      params.onError?.(error)
    }
  }

  void run()

  return {
    close: () => {
      closed = true
      controller.abort()
    }
  }
}

export const mapClientUploadProgressToRuntimePercent = (
  progress: number | null | undefined
) => {
  const normalizedProgress = clampProgressPercent(progress)
  if (normalizedProgress === null) return null

  return Math.min(
    LOCAL_UPLOAD_RUNTIME_END,
    Math.round((normalizedProgress / 100) * LOCAL_UPLOAD_RUNTIME_END)
  )
}

export const mapRvtConversionProgressToRuntimePercent = (
  progress: number | null | undefined
) => {
  const normalizedProgress = clampProgressPercent(progress)
  if (normalizedProgress === null) return null
  if (normalizedProgress >= 100) return RVT_CONVERSION_RUNTIME_END

  return Math.min(
    RVT_CONVERSION_RUNTIME_END,
    Math.round(
      RVT_CONVERSION_RUNTIME_START +
        (normalizedProgress / 100) *
          (RVT_CONVERSION_RUNTIME_END - RVT_CONVERSION_RUNTIME_START)
    )
  )
}

export const mapProgressPhaseToDescription = (
  phase: string | null | undefined
): string | null => {
  if (!phase) return null
  switch (phase) {
    case 'acknowledged':
      return '已接收转码任务'
    case 'opening':
      return '正在打开 RVT 模型'
    case 'converting':
    case 'converting_model':
      return '正在转换模型构件'
    case 'uploading_version':
      return '正在生成模型版本'
    case 'completed':
      return '转换完成'
    case 'failed':
      return '转换失败'
    default:
      return phase
  }
}

const isRvtSyncTask = (task: Pick<WorkbenchUploadSyncTask, 'status' | 'fileName'>) =>
  task.status === 'speckle_converting' && RVT_FILE_NAME_RE.test(task.fileName || '')

const mapServerTask = (task: ServerModelSyncTask): WorkbenchUploadSyncTask => ({
  id: task.id,
  projectId: task.projectId,
  modelId: task.modelId,
  fileName: task.fileName,
  uploadId: task.fileUploadId || task.fileId,
  versionId: task.versionId,
  seedId: task.seedId,
  assetId: task.assetId,
  assetName: task.assetName,
  transformTaskId: task.transformTaskId,
  status: task.status,
  progressPercent: clampProgressPercent(task.progressPercent),
  progressPhase: task.progressPhase,
  progressMessage: task.progressMessage,
  error: task.error,
  errorCode: task.errorCode,
  retriable: task.retriable,
  retryCount: task.retryCount,
  createdAt: task.createdAt,
  updatedAt: task.updatedAt
})

export const useWorkbenchUploadSync = () => {
  const apollo = useApolloClient().client
  const apiOrigin = useApiOrigin()
  const logger = useLogger()
  const authToken = useAuthCookie()
  const { triggerNotification } = useGlobalToast()
  const visibleTaskSubscriptionOwnerId = nanoid()
  let visibleTaskSyncRunId = 0

  const taskMap = useWorkbenchUploadSyncTaskMap()
  const eventSources = useWorkbenchUploadSyncEventSources()
  const pageEventSources = useWorkbenchUploadSyncPageEventSources()

  const getHeaders = () =>
    authToken.value
      ? {
          Authorization: `Bearer ${authToken.value}`
        }
      : undefined

  const tasks = computed(() =>
    Object.values(taskMap.value).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  )

  const latestTaskByModelKey = computed(() => {
    const map: Record<string, WorkbenchUploadSyncTask> = {}
    for (const task of tasks.value) {
      if (!task.modelId) continue
      const key = buildSyncingModelKey(task.projectId, task.modelId)
      const existing = map[key]
      if (!existing || task.updatedAt.localeCompare(existing.updatedAt) > 0) {
        map[key] = task
      }
    }
    return map
  })

  const tasksSignature = computed(() =>
    tasks.value
      .map(
        (task) =>
          `${task.id}:${task.status}:${task.updatedAt}:${task.retryCount}:${task.retriable}`
      )
      .join('|')
  )

  const RUNNING_STATUSES: WorkbenchUploadSyncTaskStatus[] = [
    'speckle_converting',
    'syncing_dtp_model',
    'syncing_external_ids',
    'triggering_model_transform',
    'polling_model_transform'
  ]

  const isTaskRunning = (
    task: Pick<WorkbenchUploadSyncTask, 'status'> | null | undefined
  ) => {
    if (!task) return false
    return RUNNING_STATUSES.includes(task.status)
  }

  const canResumeServerExecution = (
    task: Pick<WorkbenchUploadSyncTask, 'status' | 'retriable'>
  ) =>
    (task.status === 'failed' && task.retriable) || isTaskRunning(task)

  const getLatestTask = (params: { projectId: string; modelId: string }) =>
    latestTaskByModelKey.value[buildSyncingModelKey(params.projectId, params.modelId)] || null

  const getModelRuntimeProgress = (params: {
    projectId: string
    modelId: string
  }): WorkbenchModelSyncRuntimeProgress | null => {
    const task = getLatestTask(params)
    if (!task) return null

    if (
      task.status !== 'waiting_upload' &&
      task.status !== 'speckle_converting' &&
      task.status !== 'failed'
    ) {
      return {
        percent: RVT_CONVERSION_RUNTIME_END,
        phase: 'completed',
        message: '转换完成'
      }
    }

    if (!isRvtSyncTask(task)) return null

    if (
      task.versionId ||
      task.progressPercent === 100 ||
      task.progressPhase === 'completed'
    ) {
      return {
        percent: RVT_CONVERSION_RUNTIME_END,
        phase: 'completed',
        message: '转换完成'
      }
    }

    const percent = mapRvtConversionProgressToRuntimePercent(task.progressPercent)
    if (percent === null) return null

    return {
      percent,
      phase: task.progressPhase,
      message: task.progressMessage
    }
  }

  const getModelRuntimeProgressMessage = (params: {
    projectId: string
    modelId: string
  }): string | null => {
    const task = getLatestTask(params)
    if (!task) return null
    if (task.progressMessage?.trim()) return task.progressMessage.trim()
    return mapProgressPhaseToDescription(task.progressPhase)
  }

  const activeProjectIds = computed(() => {
    const projectIds = new Set<string>()
    for (const task of tasks.value) {
      if (!canResumeServerExecution(task)) continue
      projectIds.add(task.projectId)
    }
    return [...projectIds]
  })

  const upsertTask = (task: WorkbenchUploadSyncTask) => {
    taskMap.value = {
      ...taskMap.value,
      [task.id]: task
    }
    return task
  }

  const removeTask = (taskId: string) => {
    const next = { ...taskMap.value }
    delete next[taskId]
    taskMap.value = next
  }

  const stopTaskEventSource = (taskId: string) => {
    const source = eventSources.value[taskId]
    source?.close()
    eventSources.value = {
      ...eventSources.value,
      [taskId]: null
    }
  }

  const stopVisibleTaskSubscription = (subscriptionKey: string) => {
    const entry = pageEventSources.value[subscriptionKey]
    entry?.source.close()
    const next = { ...pageEventSources.value }
    delete next[subscriptionKey]
    pageEventSources.value = next
  }

  const cleanupVisibleTaskSubscriptions = () => {
    const nextEntries: Record<string, VisibleTaskSubscriptionState | null> = {
      ...pageEventSources.value
    }

    for (const [subscriptionKey, entry] of Object.entries(pageEventSources.value)) {
      if (!entry) continue

      const nextOwnerIds = entry.ownerIds.filter(
        (ownerId) => ownerId !== visibleTaskSubscriptionOwnerId
      )

      if (nextOwnerIds.length) {
        nextEntries[subscriptionKey] = {
          ...entry,
          ownerIds: nextOwnerIds
        }
        continue
      }

      entry.source.close()
      delete nextEntries[subscriptionKey]
    }

    pageEventSources.value = nextEntries
  }

  const refreshModelList = async () => {
    await Promise.allSettled([
      apollo.refetchQueries({
        include: [latestModelsQuery, latestModelsPaginationQuery]
      })
    ])
  }

  const getPartUploadUrl = async (params: {
    projectId: string
    modelId: string
    taskId: string
    uploadId: string
    partNumber: number
  }): Promise<string> => {
    const res = await $fetch<{ data: { url: string; partNumber: number } }>(
      `${apiOrigin}/api/v1/projects/${params.projectId}/models/${params.modelId}/model-sync/tasks/${params.taskId}/part-upload-url`,
      {
        method: 'POST',
        headers: getHeaders(),
        body: { uploadId: params.uploadId, partNumber: params.partNumber }
      }
    )

    return res.data.url
  }

  const listUploadedParts = async (params: {
    projectId: string
    modelId: string
    taskId: string
    uploadId: string
  }): Promise<UploadedPart[]> => {
    const res = await $fetch<{ data: { parts: UploadedPart[] } }>(
      `${apiOrigin}/api/v1/projects/${params.projectId}/models/${params.modelId}/model-sync/tasks/${params.taskId}/parts`,
      {
        headers: getHeaders(),
        query: { uploadId: params.uploadId }
      }
    )

    return res.data.parts || []
  }

  const abortUploadTask = async (params: {
    projectId: string
    modelId: string
    taskId: string
    uploadId: string
  }): Promise<void> => {
    await $fetch(
      `${apiOrigin}/api/v1/projects/${params.projectId}/models/${params.modelId}/model-sync/tasks/${params.taskId}/abort-upload`,
      {
        method: 'POST',
        headers: getHeaders(),
        body: { uploadId: params.uploadId }
      }
    )
  }

  const handleTaskUpdate = async (
    serverTask: ServerModelSyncTask,
    options?: Partial<{ silentSuccess: boolean; silentFailure: boolean }>
  ) => {
    const nextTask = upsertTask(mapServerTask(serverTask))

    if (nextTask.status === 'succeeded') {
      stopTaskEventSource(nextTask.id)
      await refreshModelList()
      removeTask(nextTask.id)

      if (!options?.silentSuccess) {
        triggerNotification({
          type: ToastNotificationType.Success,
          title: '模型同步成功',
          description: '后端已完成模型转换与同步'
        })
      }
    }

    if (nextTask.status === 'failed') {
      if (!nextTask.retriable) {
        stopTaskEventSource(nextTask.id)
      }
      if (!options?.silentFailure && !nextTask.retriable) {
        triggerNotification({
          type: ToastNotificationType.Danger,
          title: '模型同步失败',
          description: nextTask.error || '模型同步失败'
        })
      }
    }

    return nextTask
  }

  const subscribeTask = (task: WorkbenchUploadSyncTask) => {
    // 禁用 SSE 连接，不再建立 /events 长链接
    return
  }

  const fetchProjectTaskSnapshot = async (params: {
    projectId: string
    modelIds: string[]
  }) => {
    return await $fetch<{ data: ServerModelSyncTask[] }>(
      `${apiOrigin}/api/v1/projects/${params.projectId}/model-sync/tasks/snapshot`,
      {
        headers: getHeaders(),
        query: {
          modelIds: params.modelIds.join(',')
        }
      }
    )
  }

  const replaceTasksForModels = (params: {
    projectId: string
    modelIds: string[]
    serverTasks: ServerModelSyncTask[]
  }) => {
    const targetKeys = new Set(
      params.modelIds.map((modelId) => buildSyncingModelKey(params.projectId, modelId))
    )

    const isTaskIdentical = (
      a: WorkbenchUploadSyncTask | undefined,
      b: WorkbenchUploadSyncTask
    ) => {
      if (!a) return false
      return (
        a.id === b.id &&
        a.status === b.status &&
        a.progressPercent === b.progressPercent &&
        a.progressPhase === b.progressPhase &&
        a.progressMessage === b.progressMessage &&
        a.error === b.error &&
        a.retryCount === b.retryCount &&
        a.retriable === b.retriable &&
        a.updatedAt === b.updatedAt
      )
    }

    let hasDiff = false
    const existingTargetTasks = Object.values(taskMap.value).filter(
      (task) => task.modelId && targetKeys.has(buildSyncingModelKey(task.projectId, task.modelId))
    )

    const incomingMappedTasks = params.serverTasks
      .map(mapServerTask)
      .filter((task) => task.status !== 'succeeded')

    if (existingTargetTasks.length !== incomingMappedTasks.length) {
      hasDiff = true
    } else {
      for (const nextTask of incomingMappedTasks) {
        const currentTask = taskMap.value[nextTask.id]
        if (!isTaskIdentical(currentTask, nextTask)) {
          hasDiff = true
          break
        }
      }
    }

    if (!hasDiff) return

    const nextMap = Object.fromEntries(
      Object.entries(taskMap.value).filter(([, task]) => {
        if (!task.modelId) return true
        return !targetKeys.has(buildSyncingModelKey(task.projectId, task.modelId))
      })
    )

    for (const mappedTask of incomingMappedTasks) {
      nextMap[mappedTask.id] = mappedTask
    }

    taskMap.value = nextMap
  }

  const shouldIgnoreVisibleTaskEvent = (
    subscriptionKey: string,
    source: ClosableStream
  ) => pageEventSources.value[subscriptionKey]?.source !== source

  const subscribeVisibleTasks = (targets: VisibleTaskTarget[]) => {
    // 禁用 SSE 连接，不再从 /api/v1/model-sync/tasks/events 接收推送
    return
  }

  const createUploadTask = async (params: {
    projectId: string
    modelId: string
    fileName: string
  }) => {
    return await $fetch<CreateUploadTaskResponse>(
      `${apiOrigin}/api/v1/projects/${params.projectId}/models/${params.modelId}/model-sync/tasks`,
      {
        method: 'POST',
        headers: getHeaders(),
        body: {
          mode: 'upload',
          fileName: params.fileName
        }
      }
    )
  }

  const completeUploadTask = async (params: {
    projectId: string
    modelId: string
    taskId: string
    uploadId: string
    parts: ResumableUploadPart[]
  }) => {
    return await $fetch<{ data: ServerModelSyncTask }>(
      `${apiOrigin}/api/v1/projects/${params.projectId}/models/${params.modelId}/model-sync/tasks/${params.taskId}/complete-upload`,
      {
        method: 'POST',
        headers: getHeaders(),
        body: {
          uploadId: params.uploadId,
          parts: params.parts
        }
      }
    )
  }

  const retryServerTask = async (params: {
    projectId: string
    modelId: string
    taskId: string
  }) => {
    return await $fetch<{ data: ServerModelSyncTask }>(
      `${apiOrigin}/api/v1/projects/${params.projectId}/models/${params.modelId}/model-sync/tasks/${params.taskId}/retry`,
      {
        method: 'POST',
        headers: getHeaders()
      }
    )
  }

  const uploadModelFile = async (params: {
    projectId: string
    modelId: string
    file: File
    onProgress?: (percentage: number) => void
  }) => {
    const createResponse = await createUploadTask({
      projectId: params.projectId,
      modelId: params.modelId,
      fileName: params.file.name
    })

    const createdTask = await handleTaskUpdate(createResponse.data, {
      silentSuccess: true
    })

    if (!createResponse.upload?.fileId || !createResponse.upload?.uploadId) {
      throw new Error('创建上传任务成功，但未返回上传标识')
    }

    const { fileId, uploadId } = createResponse.upload

    const backend: ResumableUploadBackend = {
      createMultipart: async () => ({ fileId, uploadId }),
      getPartUploadUrl: ({ uploadId: partUploadId, partNumber }) =>
        getPartUploadUrl({
          projectId: params.projectId,
          modelId: params.modelId,
          taskId: createdTask.id,
          uploadId: partUploadId,
          partNumber
        }),
      listUploadedParts: ({ uploadId: partUploadId }) =>
        listUploadedParts({
          projectId: params.projectId,
          modelId: params.modelId,
          taskId: createdTask.id,
          uploadId: partUploadId
        }),
      completeMultipart: ({ uploadId: partUploadId, parts }) =>
        completeUploadTask({
          projectId: params.projectId,
          modelId: params.modelId,
          taskId: createdTask.id,
          uploadId: partUploadId,
          parts
        }).then((res) => res.data),
      abortMultipart: ({ uploadId: partUploadId }) =>
        abortUploadTask({
          projectId: params.projectId,
          modelId: params.modelId,
          taskId: createdTask.id,
          uploadId: partUploadId
        })
    }

    const uploaded = await resumableUpload(backend, {
      file: params.file,
      onProgress: params.onProgress,
      storageKey: `workbench-upload:${createdTask.id}`
    })

    const task = await handleTaskUpdate(uploaded.result as ServerModelSyncTask, {
      silentSuccess: true
    })
    subscribeTask(task)
    return task
  }

  const retryTask = async (taskId: string) => {
    const task = taskMap.value[taskId]
    if (!task?.modelId) return false

    if (task.status === 'failed') {
      const response = await retryServerTask({
        projectId: task.projectId,
        modelId: task.modelId,
        taskId: task.id
      })
      const nextTask = await handleTaskUpdate(response.data, {
        silentSuccess: true
      })
      subscribeTask(nextTask)
      return nextTask.status === 'succeeded'
    }

    return await runFullModelSync({
      projectId: task.projectId,
      modelId: task.modelId
    })
  }

  const activeTaskPoller = useScopedState(
    'workbenchUploadSyncTaskPoller',
    () => ref<ReturnType<typeof setTimeout> | null>(null)
  )
  let isPolling = false
  let currentVisibleTargets: VisibleTaskTarget[] = []

  const stopPolling = () => {
    if (activeTaskPoller.value) {
      clearTimeout(activeTaskPoller.value)
      activeTaskPoller.value = null
    }
  }

  const startPollingIfNeeded = () => {
    if (import.meta.server) return
    const hasRunningTask = tasks.value.some((task) => isTaskRunning(task))

    if (!hasRunningTask || !currentVisibleTargets.length) {
      stopPolling()
      return
    }

    if (activeTaskPoller.value) return

    const scheduleNextPoll = () => {
      activeTaskPoller.value = setTimeout(async () => {
        activeTaskPoller.value = null
        if (isPolling) return

        const stillHasRunningTask = tasks.value.some((task) => isTaskRunning(task))
        if (!stillHasRunningTask || !currentVisibleTargets.length) {
          return
        }

        isPolling = true
        try {
          await syncVisibleTasks(currentVisibleTargets)
        } finally {
          isPolling = false
          const shouldContinue = tasks.value.some((task) => isTaskRunning(task))
          if (shouldContinue && currentVisibleTargets.length) {
            scheduleNextPoll()
          }
        }
      }, 2500)
    }

    scheduleNextPoll()
  }

  const syncVisibleTasks = async (targets: VisibleTaskTarget[]) => {
    currentVisibleTargets = targets
    visibleTaskSyncRunId += 1
    const currentRunId = visibleTaskSyncRunId
    const normalizedTargets = targets
      .map((target) => ({
        projectId: target.projectId,
        modelIds: [...new Set(target.modelIds)].filter(Boolean).sort()
      }))
      .filter((target) => target.projectId && target.modelIds.length)

    const targetsWithTasks: VisibleTaskTarget[] = []

    await Promise.all(
      normalizedTargets.map(async (target) => {
        try {
          const response = await fetchProjectTaskSnapshot(target)
          if (currentRunId !== visibleTaskSyncRunId) return

          replaceTasksForModels({
            projectId: target.projectId,
            modelIds: target.modelIds,
            serverTasks: response.data
          })

          if (response.data.length) {
            targetsWithTasks.push(target)
          }
        } catch (error) {
          logger.warn(
            {
              projectId: target.projectId,
              modelIds: target.modelIds,
              error
            },
            '同步当前页模型任务快照失败'
          )
        }
      })
    )

    if (currentRunId !== visibleTaskSyncRunId) return
    startPollingIfNeeded()

    const nextSubscriptionKey = targetsWithTasks.length
      ? buildVisibleTaskBatchSubscriptionKey(targetsWithTasks)
      : null

    for (const [subscriptionKey, entry] of Object.entries(pageEventSources.value)) {
      if (!entry?.ownerIds.includes(visibleTaskSubscriptionOwnerId)) continue
      if (subscriptionKey !== nextSubscriptionKey) {
        const nextOwnerIds = entry.ownerIds.filter(
          (ownerId) => ownerId !== visibleTaskSubscriptionOwnerId
        )
        if (nextOwnerIds.length) {
          pageEventSources.value = {
            ...pageEventSources.value,
            [subscriptionKey]: {
              ...entry,
              ownerIds: nextOwnerIds
            }
          }
          continue
        }
        stopVisibleTaskSubscription(subscriptionKey)
      }
    }

    if (targetsWithTasks.length) {
      subscribeVisibleTasks(targetsWithTasks)
    }
  }

  onScopeDispose(() => {
    stopPolling()
    cleanupVisibleTaskSubscriptions()
  })

  const consumeVersionCreated = async (_params: {
    projectId: string
    version: NonNullable<
      OnProjectVersionsUpdateSubscription['projectVersionsUpdated']
    >['version']
  }) => {
    return false
  }

  const runFullModelSync = async (params: { projectId: string; modelId: string }) => {
    if (isModelSyncing(params)) return false

    try {
      const response = await $fetch<{ data: ServerModelSyncTask }>(
        `${apiOrigin}/api/v1/projects/${params.projectId}/models/${params.modelId}/model-sync/tasks`,
        {
          method: 'POST',
          headers: getHeaders(),
          body: {
            mode: 'latest_upload'
          }
        }
      )

      const task = await handleTaskUpdate(response.data, {
        silentSuccess: true
      })
      subscribeTask(task)
      return task.status === 'succeeded'
    } catch (error) {
      const message = error instanceof Error ? error.message : '同步模型失败'
      triggerNotification({
        type: ToastNotificationType.Danger,
        title: '同步模型失败',
        description: message
      })
      return false
    }
  }

  const isModelSyncing = (params: { projectId: string; modelId: string }) => {
    const latest = getLatestTask(params)
    return isTaskRunning(latest)
  }

  const setModelSyncing = (_params: {
    projectId: string
    modelId: string
    syncing: boolean
  }) => {
    // 状态以服务端任务为准，前端不再单独维护。
  }

  return {
    tasks,
    tasksSignature,
    activeProjectIds,
    getLatestTask,
    getModelRuntimeProgress,
    getModelRuntimeProgressMessage,
    uploadModelFile,
    retryTask,
    executeTask: retryTask,
    syncVisibleTasks,
    cleanupVisibleTaskSubscriptions,
    consumeVersionCreated,
    runFullModelSync,
    setModelSyncing,
    isModelSyncing
  }
}
