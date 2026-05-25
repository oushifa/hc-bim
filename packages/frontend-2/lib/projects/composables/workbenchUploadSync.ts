import { useApolloClient } from '@vue/apollo-composable'
import { useStorage } from '@vueuse/core'
import type { OnProjectVersionsUpdateSubscription } from '~/lib/common/generated/gql/graphql'
import {
  latestModelsPaginationQuery,
  latestModelsQuery
} from '~/lib/projects/graphql/queries'
import { gql } from 'graphql-tag'
import type { FetchError } from 'ofetch'
import { ToastNotificationType, useGlobalToast } from '~~/lib/common/composables/toast'
import { useDtpModelUpload } from '~~/composables/useDtpModelUpload'
import { useAuthCookie } from '~~/lib/auth/composables/auth'
import { FileUploadConvertedStatus } from '~~/lib/core/api/fileImport'
import { useScopedState } from '~~/lib/common/composables/scopedState'

const WORKBENCH_UPLOAD_SYNC_TASK_STORAGE_KEY = 'workbench-upload-sync-tasks'
const MODEL_TRANSFORM_API_VERSION = '2.3.0'
const MODEL_TRANSFORM_POLL_INTERVAL = 10000

export type WorkbenchUploadSyncTaskStatus =
  | 'pending_version_created'
  | 'matched'
  | 'syncing_dtp_model'
  | 'syncing_external_ids'
  | 'triggering_model_transform'
  | 'polling_model_transform'
  | 'error'

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
  retryCount: number
  createdAt: string
  updatedAt: string
}

type LatestModelUploadResponse = {
  project?: {
    model?: {
      id: string
      uploads?: {
        items?: Array<{
          id: string
          fileName: string
          uploadComplete: boolean
          convertedStatus?: number | null
          convertedMessage?: string | null
          convertedVersionId?: string | null
        }>
      }
    }
  }
}

type SyncLatestVersionResponse = {
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
          assetId?: string | null
          assetName?: string | null
        }>
      }
    }
  }
}

type VersionExternalIds = Partial<{
  seedId: string
  assetId: string
  assetName: string
}>

type ModelTransformResponse = {
  code?: number
  success?: boolean
  msg?: string
  messages?: string
  results?: {
    taskId?: string
  }
  result?: {
    taskId?: string
  }
}

type ModelTransformStatusResponse = {
  code?: number
  status?: string
  messages?: string
  msg?: string
  result?: {
    taskId?: string
    assetId?: string
    assetName?: string
    status?: 'SUCCEEDED' | 'FAILED' | 'QUEUING' | 'STOPPED' | 'RUNNING' | string
  }
}

const latestModelUploadQuery = gql`
  query WorkbenchLatestModelUpload($projectId: String!, $modelId: String!) {
    project(id: $projectId) {
      id
      model(id: $modelId) {
        id
        uploads(input: { limit: 50 }) {
          items {
            id
            fileName
            uploadComplete
            convertedStatus
            convertedMessage
            convertedVersionId
          }
        }
      }
    }
  }
`

const syncModelLatestVersionQuery = gql`
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
            assetId
            assetName
          }
        }
      }
    }
  }
`

const updateVersionExternalIdsMutation = gql`
  mutation WorkbenchUpdateVersionExternalIds($input: UpdateVersionInput!) {
    versionMutations {
      update(input: $input) {
        id
      }
    }
  }
`

const useWorkbenchUploadSyncTaskMap = () => {
  const serverFallback = ref<Record<string, WorkbenchUploadSyncTask>>({})
  return import.meta.server
    ? serverFallback
    : useStorage<Record<string, WorkbenchUploadSyncTask>>(
        WORKBENCH_UPLOAD_SYNC_TASK_STORAGE_KEY,
        {}
      )
}

const useWorkbenchUploadSyncRunningIds = () =>
  useScopedState('workbenchUploadSyncRunningIds', () => ref<string[]>([]))

const useWorkbenchUploadSyncingModelKeys = () =>
  useScopedState('workbenchUploadSyncingModelKeys', () => ref<string[]>([]))

const sleep = async (ms: number) =>
  await new Promise((resolve) => setTimeout(resolve, ms))

const buildSyncingModelKey = (projectId: string, modelId: string) =>
  `${projectId}:${modelId}`

const buildTaskId = (params: {
  projectId: string
  modelId: string | null
  fileName: string
  uploadId: string | null
}) =>
  params.uploadId?.trim() ||
  `${params.projectId}:${params.modelId || 'new-model'}:${params.fileName}`

export const useWorkbenchUploadSync = () => {
  const apollo = useApolloClient().client
  const logger = useLogger()
  const apiOrigin = useApiOrigin()
  const authToken = useAuthCookie()
  const { $dtpFetch } = useNuxtApp()
  const { triggerNotification } = useGlobalToast()
  const {
    ensureDtpToken,
    syncModelFileForVersion,
    clearVersionMetadataSyncRecord,
    getVersionMetadataSyncRecord
  } = useDtpModelUpload()

  const taskMap = useWorkbenchUploadSyncTaskMap()
  const runningIds = useWorkbenchUploadSyncRunningIds()
  const syncingModelKeys = useWorkbenchUploadSyncingModelKeys()

  const dtpFetch = $dtpFetch as <T = unknown>(
    request: string,
    options?: {
      method?: string
      headers?: HeadersInit
      body?: BodyInit | Record<string, unknown> | null
      originPath?: boolean
      prefix?: string
    }
  ) => Promise<T>

  const tasks = computed(() =>
    Object.values(taskMap.value).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  )

  const tasksSignature = computed(() =>
    tasks.value.map((task) => `${task.id}:${task.status}:${task.updatedAt}`).join('|')
  )

  const activeProjectIds = computed(() => {
    const projectIds = new Set<string>()
    for (const task of tasks.value) {
      if (task.status === 'error') continue
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

  const patchTask = (
    taskId: string,
    patch: Partial<Omit<WorkbenchUploadSyncTask, 'id' | 'createdAt'>>
  ) => {
    const current = taskMap.value[taskId]
    if (!current) return null
    const next = {
      ...current,
      ...patch,
      updatedAt: new Date().toISOString()
    }
    return upsertTask(next)
  }

  const removeTask = (taskId: string) => {
    const next = { ...taskMap.value }
    delete next[taskId]
    taskMap.value = next
  }

  const isTaskRunning = (taskId: string) => runningIds.value.includes(taskId)

  const setTaskRunning = (taskId: string, running: boolean) => {
    const next = new Set(runningIds.value)
    if (running) next.add(taskId)
    else next.delete(taskId)
    runningIds.value = [...next]
  }

  const setModelSyncing = (params: {
    projectId: string
    modelId: string
    syncing: boolean
  }) => {
    const key = buildSyncingModelKey(params.projectId, params.modelId)
    const next = new Set(syncingModelKeys.value)
    if (params.syncing) next.add(key)
    else next.delete(key)
    syncingModelKeys.value = [...next]
  }

  const isModelSyncing = (params: { projectId: string; modelId: string }) =>
    syncingModelKeys.value.includes(
      buildSyncingModelKey(params.projectId, params.modelId)
    )

  const getLatestTaskForModel = (params: { projectId: string; modelId: string }) =>
    tasks.value
      .filter(
        (task) => task.projectId === params.projectId && task.modelId === params.modelId
      )
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] || null

  const fetchLatestVersionInfo = async (params: {
    projectId: string
    modelId: string
  }) => {
    const response = await apollo.query<SyncLatestVersionResponse>({
      query: syncModelLatestVersionQuery,
      variables: {
        projectId: params.projectId,
        modelId: params.modelId
      },
      fetchPolicy: 'no-cache'
    })

    const version = response.data?.project?.model?.versions?.items?.[0]
    if (!version?.id) {
      return null
    }

    return {
      modelName: response.data?.project?.model?.name || '',
      versionId: version.id,
      createdAt: version.createdAt,
      referencedObject: version.referencedObject || null,
      seedId: version.seedId || null,
      assetId: version.assetId || null,
      assetName: version.assetName || null
    }
  }

  const fetchLatestModelUpload = async (params: {
    projectId: string
    modelId: string
  }) => {
    const response = await apollo.query<LatestModelUploadResponse>({
      query: latestModelUploadQuery,
      variables: {
        projectId: params.projectId,
        modelId: params.modelId
      },
      fetchPolicy: 'no-cache'
    })

    const upload = response.data?.project?.model?.uploads?.items?.[0]
    if (!upload?.id || !upload.fileName) {
      throw new Error('未找到最近一次模型上传记录，无法补同步模型')
    }
    if (!upload.uploadComplete) {
      throw new Error('最近一次模型上传尚未完成，请稍后再试')
    }

    return upload
  }

  const registerPendingUpload = (params: {
    projectId: string
    modelId: string | null
    fileName: string
    uploadId: string | null
  }) => {
    const fileName = params.fileName.trim()
    if (!fileName) return null

    const taskId = buildTaskId({
      projectId: params.projectId,
      modelId: params.modelId,
      fileName,
      uploadId: params.uploadId
    })
    const now = new Date().toISOString()

    return upsertTask({
      id: taskId,
      projectId: params.projectId,
      modelId: params.modelId,
      fileName,
      uploadId: params.uploadId,
      versionId: null,
      seedId: taskMap.value[taskId]?.seedId || null,
      assetId: taskMap.value[taskId]?.assetId || null,
      assetName: taskMap.value[taskId]?.assetName || null,
      transformTaskId: taskMap.value[taskId]?.transformTaskId || null,
      status: 'pending_version_created',
      error: null,
      retryCount: taskMap.value[taskId]?.retryCount || 0,
      createdAt: taskMap.value[taskId]?.createdAt || now,
      updatedAt: now
    })
  }

  const refreshModelList = async () => {
    await Promise.allSettled([
      apollo.refetchQueries({
        include: [latestModelsQuery, latestModelsPaginationQuery]
      })
    ])
  }

  const fetchModelUploadForVersion = async (params: {
    projectId: string
    modelId: string
    versionId: string
    uploadId?: string | null
    fileName?: string
  }) => {
    const response = await apollo.query<LatestModelUploadResponse>({
      query: latestModelUploadQuery,
      variables: {
        projectId: params.projectId,
        modelId: params.modelId
      },
      fetchPolicy: 'no-cache'
    })

    const uploads = response.data?.project?.model?.uploads?.items || []
    const uploadByVersionId = uploads.find(
      (item) => item.convertedVersionId === params.versionId
    )
    const uploadById = params.uploadId
      ? uploads.find((item) => item.id === params.uploadId)
      : undefined

    const upload = params.uploadId
      ? uploadByVersionId?.id === params.uploadId
        ? uploadByVersionId
        : uploadById?.convertedVersionId === params.versionId
        ? uploadById
        : undefined
      : uploadByVersionId || uploads.find((item) => item.fileName === params.fileName)

    if (!upload?.id || !upload.fileName) {
      throw new Error('未找到版本对应的模型上传记录，无法同步中海模型')
    }
    if (!upload.uploadComplete) {
      throw new Error('模型上传尚未完成，暂时无法同步中海模型')
    }

    return upload
  }

  const fetchModelUploadFile = async (params: {
    projectId: string
    uploadId: string
    fileName: string
  }) => {
    const response = await fetch(
      `${apiOrigin}/api/stream/${params.projectId}/blob/${params.uploadId}`,
      {
        method: 'GET',
        credentials: 'same-origin',
        headers: authToken.value
          ? { Authorization: `Bearer ${authToken.value}` }
          : undefined
      }
    )

    if (!response.ok) {
      let message = `下载模型源文件失败 (${response.status})`
      try {
        const body = (await response.json()) as {
          error?: string | { message?: string }
        }
        if (typeof body.error === 'string') message = body.error
        else if (body.error?.message) message = body.error.message
      } catch {
        // Ignore non-JSON error bodies
      }
      throw new Error(message)
    }

    const blob = await response.blob()
    return new File([blob], params.fileName, {
      type: blob.type || 'application/octet-stream',
      lastModified: Date.now()
    })
  }

  const updateVersionExternalIds = async (params: {
    projectId: string
    versionId: string
    externalIds?: VersionExternalIds
  }) => {
    if (
      !params.externalIds?.seedId &&
      !params.externalIds?.assetId &&
      !params.externalIds?.assetName
    ) {
      throw new Error('中海上传完成，但未拿到可回填的 seedId/assetId/assetName')
    }

    const { data, errors } = await apollo.mutate<{
      versionMutations?: {
        update?: {
          id: string
        } | null
      } | null
    }>({
      mutation: updateVersionExternalIdsMutation,
      variables: {
        input: {
          projectId: params.projectId,
          versionId: params.versionId,
          ...(params.externalIds?.seedId ? { seedId: params.externalIds.seedId } : {}),
          ...(params.externalIds?.assetId
            ? { assetId: params.externalIds.assetId }
            : {}),
          ...(params.externalIds?.assetName
            ? { assetName: params.externalIds.assetName }
            : {})
        }
      } as Record<string, unknown>
    })

    if (!data?.versionMutations?.update?.id) {
      throw new Error(
        (errors?.[0]?.message as string | undefined) ||
          '回填 seedId/assetId/assetName 失败'
      )
    }
  }

  const triggerModelTransform = async (params: {
    assetId: string
    assetName: string
  }) => {
    const response = await dtpFetch<ModelTransformResponse>(
      '/v1/asset/model/transform',
      {
        method: 'POST',
        body: {
          assetId: params.assetId,
          assetName: params.assetName,
          apiVersion: MODEL_TRANSFORM_API_VERSION
        }
      }
    )

    const taskId = response.results?.taskId || response.result?.taskId
    if (!response.success || !taskId) {
      throw new Error(response.msg || response.messages || '触发模型转换失败')
    }

    return taskId
  }

  const pollModelTransformUntilFinished = async (taskId: string) => {
    while (true) {
      const response = await dtpFetch<ModelTransformStatusResponse>(
        `/v1/daas/pipeline/task/${taskId}`,
        {
          method: 'GET'
        }
      )
      const status = response.result?.status

      if (status === 'SUCCEEDED') {
        return response
      }
      if (status === 'FAILED' || status === 'STOPPED') {
        throw new Error(
          response.messages || response.msg || `模型转换失败，当前状态为 ${status}`
        )
      }
      if (status !== 'QUEUING' && status !== 'RUNNING') {
        logger.warn(
          {
            taskId,
            status,
            response
          },
          '模型转换返回了未知状态，继续轮询'
        )
      }

      await sleep(MODEL_TRANSFORM_POLL_INTERVAL)
    }
  }

  const executeTask = async (taskId: string) => {
    const task = taskMap.value[taskId]
    if (!task || isTaskRunning(taskId)) return false
    if (!task.projectId || !task.modelId || !task.versionId || !task.uploadId)
      return false

    setTaskRunning(taskId, true)
    setModelSyncing({
      projectId: task.projectId,
      modelId: task.modelId,
      syncing: true
    })

    try {
      let latestTask = taskMap.value[taskId] || task
      let externalIds: VersionExternalIds = {
        seedId: latestTask.seedId || undefined,
        assetId: latestTask.assetId || undefined,
        assetName: latestTask.assetName || undefined
      }

      if (!externalIds.seedId || !externalIds.assetId || !externalIds.assetName) {
        patchTask(taskId, {
          status: 'syncing_dtp_model',
          error: null
        })

        const file = await fetchModelUploadFile({
          projectId: task.projectId,
          uploadId: task.uploadId,
          fileName: task.fileName
        })
        const uploadedExternalIds = await syncModelFileForVersion({
          file,
          fileUploadId: task.uploadId,
          projectId: task.projectId,
          modelId: task.modelId,
          versionId: task.versionId
        })
        const storedExternalIds = getVersionMetadataSyncRecord(task.uploadId)
        externalIds = {
          seedId: uploadedExternalIds?.seedId || storedExternalIds?.seedId,
          assetId: uploadedExternalIds?.assetId || storedExternalIds?.assetId,
          assetName: uploadedExternalIds?.assetName || storedExternalIds?.assetName
        }
        patchTask(taskId, {
          seedId: externalIds.seedId || null,
          assetId: externalIds.assetId || null,
          assetName: externalIds.assetName || null
        })
      }

      patchTask(taskId, {
        status: 'syncing_external_ids',
        seedId: externalIds.seedId || null,
        assetId: externalIds.assetId || null,
        assetName: externalIds.assetName || null
      })
      await updateVersionExternalIds({
        projectId: task.projectId,
        versionId: task.versionId,
        externalIds
      })
      clearVersionMetadataSyncRecord(task.uploadId)

      latestTask = taskMap.value[taskId] || latestTask
      let transformTaskId = latestTask.transformTaskId
      if (!transformTaskId) {
        if (!externalIds.assetId || !externalIds.assetName) {
          throw new Error('模型转换前缺少 assetId 或 assetName')
        }
        patchTask(taskId, {
          status: 'triggering_model_transform'
        })
        transformTaskId = await triggerModelTransform({
          assetId: externalIds.assetId,
          assetName: externalIds.assetName
        })
        patchTask(taskId, {
          transformTaskId
        })
      }

      patchTask(taskId, {
        status: 'polling_model_transform',
        transformTaskId
      })
      await pollModelTransformUntilFinished(transformTaskId)

      await refreshModelList()

      triggerNotification({
        type: ToastNotificationType.Success,
        title: '模型同步成功',
        description: '已回填 seedId/assetId/assetName，并完成中海模型转换'
      })

      removeTask(taskId)
      return true
    } catch (error) {
      if (task.uploadId) {
        clearVersionMetadataSyncRecord(task.uploadId)
      }
      const message = error instanceof Error ? error.message : '模型同步失败'
      logger.error(error, '全局自动同步中海模型失败')
      patchTask(taskId, {
        status: 'error',
        error: message,
        retryCount: (taskMap.value[taskId]?.retryCount || 0) + 1
      })
      return false
    } finally {
      setTaskRunning(taskId, false)
      if (task.modelId) {
        setModelSyncing({
          projectId: task.projectId,
          modelId: task.modelId,
          syncing: false
        })
      }
    }
  }

  const consumeVersionCreated = async (params: {
    projectId: string
    version: NonNullable<
      OnProjectVersionsUpdateSubscription['projectVersionsUpdated']
    >['version']
  }) => {
    const version = params.version
    if (!version) return false

    const candidates = tasks.value.filter((task) => {
      if (task.projectId !== params.projectId) return false
      if (task.status !== 'pending_version_created') return false
      if (task.modelId && task.modelId !== version.model.id) return false
      return !!version.message?.includes(task.fileName)
    })

    for (const candidate of candidates) {
      try {
        const upload = await fetchModelUploadForVersion({
          projectId: params.projectId,
          modelId: version.model.id,
          versionId: version.id,
          uploadId: candidate.uploadId,
          fileName: candidate.fileName
        })

        patchTask(candidate.id, {
          modelId: version.model.id,
          versionId: version.id,
          uploadId: upload.id,
          fileName: upload.fileName,
          transformTaskId: null,
          status: 'matched',
          error: null
        })

        void executeTask(candidate.id)
        return true
      } catch {
        // Try the next candidate. This can happen when multiple versions share the same file name.
      }
    }

    return false
  }

  const retryTask = async (taskId: string) => {
    const task = taskMap.value[taskId]
    if (!task) return false
    patchTask(taskId, {
      status:
        task.modelId && task.versionId && task.uploadId
          ? 'matched'
          : 'pending_version_created',
      transformTaskId: null,
      error: null
    })
    return await executeTask(taskId)
  }

  const resumeInterruptedTasks = async () => {
    const resumableStatuses: WorkbenchUploadSyncTaskStatus[] = [
      'matched',
      'syncing_dtp_model',
      'syncing_external_ids',
      'triggering_model_transform',
      'polling_model_transform'
    ]

    for (const task of tasks.value) {
      if (!resumableStatuses.includes(task.status)) continue
      void executeTask(task.id)
    }
  }

  const runFullModelSync = async (params: { projectId: string; modelId: string }) => {
    if (isModelSyncing(params)) return false

    try {
      const upload = await fetchLatestModelUpload(params)
      if (upload.convertedStatus === FileUploadConvertedStatus.Error) {
        throw new Error(
          upload.convertedMessage?.trim() || '模型转换失败，请先处理转换错误'
        )
      }
      if (upload.convertedStatus !== FileUploadConvertedStatus.Completed) {
        throw new Error('模型尚未转换成功，请稍后再试')
      }

      const latestVersion = await fetchLatestVersionInfo(params)
      const task = registerPendingUpload({
        projectId: params.projectId,
        modelId: params.modelId,
        fileName: upload.fileName,
        uploadId: upload.id
      })
      if (!task) {
        throw new Error('未找到可登记的同步任务')
      }

      if (!latestVersion?.versionId) {
        triggerNotification({
          type: ToastNotificationType.Info,
          title: '等待版本创建',
          description: '已登记模型同步任务，版本创建后会自动继续执行'
        })
        return false
      }

      let matchedUpload: Awaited<ReturnType<typeof fetchModelUploadForVersion>> | null =
        null
      try {
        matchedUpload = await fetchModelUploadForVersion({
          projectId: params.projectId,
          modelId: params.modelId,
          versionId: latestVersion.versionId,
          uploadId: upload.id,
          fileName: upload.fileName
        })
      } catch {
        try {
          matchedUpload = await fetchModelUploadForVersion({
            projectId: params.projectId,
            modelId: params.modelId,
            versionId: latestVersion.versionId,
            fileName: upload.fileName
          })
        } catch {
          matchedUpload = null
        }
      }

      if (!matchedUpload) {
        triggerNotification({
          type: ToastNotificationType.Info,
          title: '等待版本创建',
          description: '已登记模型同步任务，待版本与上传记录关联后会自动继续执行'
        })
        return false
      }

      patchTask(task.id, {
        modelId: params.modelId,
        versionId: latestVersion.versionId,
        uploadId: matchedUpload.id,
        fileName: matchedUpload.fileName,
        status: 'matched',
        error: null
      })

      return await executeTask(task.id)
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

  return {
    tasks,
    tasksSignature,
    activeProjectIds,
    registerPendingUpload,
    removeTask,
    retryTask,
    executeTask,
    resumeInterruptedTasks,
    consumeVersionCreated,
    runFullModelSync,
    setModelSyncing,
    isModelSyncing
  }
}
