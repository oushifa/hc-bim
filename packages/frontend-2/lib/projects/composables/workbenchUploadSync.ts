import { useApolloClient } from '@vue/apollo-composable'
import { useStorage } from '@vueuse/core'
import type { OnProjectVersionsUpdateSubscription } from '~/lib/common/generated/gql/graphql'
import {
  latestModelsPaginationQuery,
  latestModelsQuery
} from '~/lib/projects/graphql/queries'
import { ToastNotificationType, useGlobalToast } from '~~/lib/common/composables/toast'
import { useAuthCookie } from '~~/lib/auth/composables/auth'
import { useScopedState } from '~~/lib/common/composables/scopedState'

const WORKBENCH_UPLOAD_SYNC_TASK_STORAGE_KEY = 'workbench-upload-sync-tasks'
const TASK_POLL_INTERVAL = 3000
const AUTO_RETRY_LIMIT = 2

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
    uploadUrl: string
  }
}

const FINAL_STATUSES: WorkbenchUploadSyncTaskStatus[] = ['succeeded', 'failed']
const CLIENT_UPLOAD_ONLY_STATUSES: WorkbenchUploadSyncTaskStatus[] = ['waiting_upload']

const useWorkbenchUploadSyncTaskMap = () => {
  const serverFallback = ref<Record<string, WorkbenchUploadSyncTask>>({})
  return import.meta.server
    ? serverFallback
    : useStorage<Record<string, WorkbenchUploadSyncTask>>(
        WORKBENCH_UPLOAD_SYNC_TASK_STORAGE_KEY,
        {}
      )
}

const useWorkbenchUploadSyncEventSources = () =>
  useScopedState('workbenchUploadSyncEventSources', () =>
    ref<Record<string, EventSource | null>>({})
  )

const useWorkbenchUploadSyncTaskPollers = () =>
  useScopedState('workbenchUploadSyncTaskPollers', () =>
    ref<Record<string, number | null>>({})
  )

const buildSyncingModelKey = (projectId: string, modelId: string) =>
  `${projectId}:${modelId}`

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

  const taskMap = useWorkbenchUploadSyncTaskMap()
  const eventSources = useWorkbenchUploadSyncEventSources()
  const taskPollers = useWorkbenchUploadSyncTaskPollers()

  const getHeaders = () =>
    authToken.value
      ? {
          Authorization: `Bearer ${authToken.value}`
        }
      : undefined

  const tasks = computed(() =>
    Object.values(taskMap.value).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  )

  const tasksSignature = computed(() =>
    tasks.value
      .map(
        (task) =>
          `${task.id}:${task.status}:${task.updatedAt}:${task.retryCount}:${task.retriable}`
      )
      .join('|')
  )

  const canResumeServerExecution = (task: Pick<WorkbenchUploadSyncTask, 'status'>) =>
    !FINAL_STATUSES.includes(task.status) &&
    !CLIENT_UPLOAD_ONLY_STATUSES.includes(task.status)

  const canAutoRetryTask = (
    task: Pick<WorkbenchUploadSyncTask, 'status' | 'retriable' | 'retryCount'>
  ) => task.status === 'failed' && task.retriable && task.retryCount < AUTO_RETRY_LIMIT

  const activeProjectIds = computed(() => {
    const projectIds = new Set<string>()
    for (const task of tasks.value) {
      if (!canResumeServerExecution(task) && !canAutoRetryTask(task)) continue
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

  const stopTaskPolling = (taskId: string) => {
    const current = taskPollers.value[taskId]
    if (current !== null && current !== undefined) {
      window.clearInterval(current)
    }
    taskPollers.value = {
      ...taskPollers.value,
      [taskId]: null
    }
  }

  const refreshModelList = async () => {
    await Promise.allSettled([
      apollo.refetchQueries({
        include: [latestModelsQuery, latestModelsPaginationQuery]
      })
    ])
  }

  const uploadToSignedUrl = async (
    file: File,
    uploadUrl: string,
    onProgress?: (percentage: number) => void
  ): Promise<{ etag: string }> => {
    const request = new XMLHttpRequest()

    return await new Promise<{ etag: string }>((resolve, reject) => {
      request.open('PUT', uploadUrl)
      request.setRequestHeader('Content-Type', file.type || 'application/octet-stream')

      request.upload.addEventListener('progress', (e) => {
        if (!e.lengthComputable) return
        onProgress?.((e.loaded / e.total) * 100)
      })

      request.addEventListener('load', () => {
        if (request.status < 200 || request.status >= 300) {
          return reject(
            new Error(`模型文件上传失败${request.status ? ` (${request.status})` : ''}`)
          )
        }

        const etag = request.getResponseHeader('ETag')
        if (!etag) {
          return reject(new Error('模型文件上传成功，但未返回 ETag'))
        }

        resolve({ etag })
      })

      request.addEventListener('error', () => {
        reject(new Error('模型文件上传失败'))
      })

      request.send(file)
    })
  }

  const handleTaskUpdate = async (
    serverTask: ServerModelSyncTask,
    options?: Partial<{ silentSuccess: boolean; silentFailure: boolean }>
  ) => {
    const nextTask = upsertTask(mapServerTask(serverTask))

    if (nextTask.status === 'succeeded') {
      stopTaskEventSource(nextTask.id)
      stopTaskPolling(nextTask.id)
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
      stopTaskEventSource(nextTask.id)
      stopTaskPolling(nextTask.id)
      if (!options?.silentFailure && !canAutoRetryTask(nextTask)) {
        triggerNotification({
          type: ToastNotificationType.Danger,
          title: '模型同步失败',
          description: nextTask.error || '模型同步失败'
        })
      }
    }

    return nextTask
  }

  const startTaskPolling = (task: WorkbenchUploadSyncTask) => {
    if (import.meta.server) return
    if (!canResumeServerExecution(task)) return
    if (taskPollers.value[task.id]) return

    const timer = window.setInterval(async () => {
      try {
        if (!task.modelId) return
        const response = await fetchTask({
          projectId: task.projectId,
          modelId: task.modelId,
          taskId: task.id
        })
        await handleTaskUpdate(response.data, {
          silentSuccess: true
        })
      } catch (error) {
        logger.warn(
          {
            taskId: task.id,
            error
          },
          '轮询模型同步任务失败'
        )
      }
    }, TASK_POLL_INTERVAL)

    taskPollers.value = {
      ...taskPollers.value,
      [task.id]: timer
    }
  }

  const subscribeTask = (task: WorkbenchUploadSyncTask) => {
    if (import.meta.server) return
    if (!task.modelId || !canResumeServerExecution(task)) return
    if (eventSources.value[task.id]) return

    stopTaskPolling(task.id)

    const streamUrl = `/api/projects/${task.projectId}/models/${task.modelId}/model-sync/tasks/${task.id}/events`
    const source = new EventSource(streamUrl, {
      withCredentials: true
    })

    const handleMessage = async (event: MessageEvent<string>) => {
      try {
        const payload = JSON.parse(event.data) as ServerModelSyncTask
        await handleTaskUpdate(payload, {
          silentSuccess: true
        })
      } catch (error) {
        logger.warn(
          {
            taskId: task.id,
            error
          },
          '解析模型同步 SSE 消息失败'
        )
      }
    }

    source.addEventListener('snapshot', (event) => {
      void handleMessage(event as MessageEvent<string>)
    })
    source.addEventListener('update', (event) => {
      void handleMessage(event as MessageEvent<string>)
    })
    source.onerror = () => {
      stopTaskEventSource(task.id)
      startTaskPolling(task)
    }

    eventSources.value = {
      ...eventSources.value,
      [task.id]: source
    }
  }

  const fetchTask = async (params: {
    projectId: string
    modelId: string
    taskId: string
  }) => {
    return await $fetch<{ data: ServerModelSyncTask }>(
      `${apiOrigin}/api/v1/projects/${params.projectId}/models/${params.modelId}/model-sync/tasks/${params.taskId}`,
      {
        headers: getHeaders()
      }
    )
  }

  const fetchProjectResumableTasks = async (params: { projectId: string }) => {
    return await $fetch<{ data: ServerModelSyncTask[] }>(
      `${apiOrigin}/api/v1/projects/${params.projectId}/model-sync/tasks`,
      {
        headers: getHeaders(),
        query: {
          status: 'resumable'
        }
      }
    )
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
    etag: string
  }) => {
    return await $fetch<{ data: ServerModelSyncTask }>(
      `${apiOrigin}/api/v1/projects/${params.projectId}/models/${params.modelId}/model-sync/tasks/${params.taskId}/complete-upload`,
      {
        method: 'POST',
        headers: getHeaders(),
        body: {
          etag: params.etag
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

    if (!createResponse.upload?.uploadUrl) {
      throw new Error('创建上传任务成功，但未返回上传地址')
    }

    const { etag } = await uploadToSignedUrl(
      params.file,
      createResponse.upload.uploadUrl,
      params.onProgress
    )

    const completeResponse = await completeUploadTask({
      projectId: params.projectId,
      modelId: params.modelId,
      taskId: createdTask.id,
      etag
    })

    const task = await handleTaskUpdate(completeResponse.data, {
      silentSuccess: true
    })
    subscribeTask(task)
    return task
  }

  const retryTask = async (taskId: string) => {
    const task = taskMap.value[taskId]
    if (!task?.modelId) return false

    if (canAutoRetryTask(task)) {
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

  const autoRetryTask = async (task: WorkbenchUploadSyncTask) => {
    if (!task.modelId || !canAutoRetryTask(task)) return false

    const response = await retryServerTask({
      projectId: task.projectId,
      modelId: task.modelId,
      taskId: task.id
    })
    const nextTask = await handleTaskUpdate(response.data, {
      silentSuccess: true
    })
    subscribeTask(nextTask)
    return true
  }

  const resumeProjectTasks = async (projectId: string) => {
    try {
      const response = await fetchProjectResumableTasks({ projectId })
      const resumableTasks = response.data
      const resumableTaskIds = new Set(resumableTasks.map((task) => task.id))

      for (const serverTask of resumableTasks) {
        const mappedTask = mapServerTask(serverTask)
        if (canAutoRetryTask(mappedTask)) {
          try {
            await autoRetryTask(mappedTask)
            continue
          } catch (error) {
            logger.warn(
              {
                projectId,
                taskId: mappedTask.id,
                error
              },
              '自动重试模型同步任务失败'
            )
          }
        }

        const nextTask = await handleTaskUpdate(serverTask, {
          silentSuccess: true,
          silentFailure: true
        })
        subscribeTask(nextTask)
      }

      const localProjectTasks = tasks.value.filter(
        (task) => task.projectId === projectId && task.status !== 'succeeded'
      )

      for (const task of localProjectTasks) {
        if (resumableTaskIds.has(task.id)) continue

        if (CLIENT_UPLOAD_ONLY_STATUSES.includes(task.status)) {
          stopTaskEventSource(task.id)
          stopTaskPolling(task.id)
          removeTask(task.id)
          continue
        }

        if (!task.modelId) continue

        try {
          const taskResponse = await fetchTask({
            projectId: task.projectId,
            modelId: task.modelId,
            taskId: task.id
          })
          const nextTask = await handleTaskUpdate(taskResponse.data, {
            silentSuccess: true,
            silentFailure: true
          })

          if (canAutoRetryTask(nextTask)) {
            await autoRetryTask(nextTask)
            continue
          }

          subscribeTask(nextTask)
        } catch (error) {
          logger.warn(
            {
              projectId,
              taskId: task.id,
              error
            },
            '补偿查询模型同步任务失败'
          )
        }
      }
    } catch (error) {
      logger.warn(
        {
          projectId,
          error
        },
        '按项目恢复模型同步任务失败'
      )
    }
  }

  const resumeInterruptedTasks = async (projectIds?: string[]) => {
    const ids = projectIds?.length
      ? [...new Set(projectIds)]
      : [...new Set(tasks.value.map((task) => task.projectId))]

    for (const projectId of ids) {
      await resumeProjectTasks(projectId)
    }
  }

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

  const isModelSyncing = (params: { projectId: string; modelId: string }) =>
    tasks.value.some(
      (task) =>
        task.modelId &&
        buildSyncingModelKey(task.projectId, task.modelId) ===
          buildSyncingModelKey(params.projectId, params.modelId) &&
        canResumeServerExecution(task)
    )

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
    uploadModelFile,
    retryTask,
    executeTask: retryTask,
    resumeProjectTasks,
    resumeInterruptedTasks,
    consumeVersionCreated,
    runFullModelSync,
    setModelSyncing,
    isModelSyncing
  }
}
