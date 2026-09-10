import { ensureError } from '@speckle/shared'
import { useAuthCookie } from '~~/lib/auth/composables/auth'
import { useApiOrigin } from '~~/composables/env'

/** 模型上传后的阶段：upload(上传) -> conversion(转换) -> sync(同步) */
export type ModelSyncStopStage = 'upload' | 'conversion' | 'sync' | null

export type ModelSyncStopResult = {
  /** 当前所处阶段 */
  stage: ModelSyncStopStage
  /** 是否确实停止了后台任务 */
  stopped: boolean
  taskId: string | null
  /** 被取消的 ifc/dxf/skp 后台导入任务 id */
  cancelledQueueJobs: string[]
  /** 被取消的 rvt/nwd/nwc 转换任务 id（已通过 WebSocket 通知 Worker） */
  cancelledRvtJobs: string[]
  /** 被删除的中海 DTP 资产 id */
  deletedDtpAssetId: string | null
  errors: string[]
}

/**
 * 停止某个模型当前阶段正在进行的转换/同步，供模型删除前调用。
 *
 * 后端按阶段自行分流（POST /api/v1/projects/:projectId/models/:modelId/model-sync/stop）：
 * - 转换阶段：ifc/dxf/skp 取消后台导入队列任务；rvt/nwd/nwc 通过 WebSocket 向对应 Worker
 *   下发 {"type":"delete","taskId":"..."}
 * - 同步阶段：调用中海 DTP 的 DELETE /v1/daas/asset/model/delete/{assetId}
 *
 * 这里刻意不依赖 useWorkbenchUploadSync（它会注册 onScopeDispose 清理全局轮询器），
 * 以便在删除弹窗这类短生命周期组件中安全使用。停止失败不阻塞删除，仅记录日志并返回 null。
 */
export const useStopModelSyncTask = () => {
  const apiOrigin = useApiOrigin()
  const authToken = useAuthCookie()
  const logger = useLogger()

  return async (params: {
    projectId: string
    modelId: string
    reason?: string
  }): Promise<ModelSyncStopResult | null> => {
    try {
      const response = await $fetch<{ data: ModelSyncStopResult }>(
        `${apiOrigin}/api/v1/projects/${params.projectId}/models/${params.modelId}/model-sync/stop`,
        {
          method: 'POST',
          headers: authToken.value
            ? {
                Authorization: `Bearer ${authToken.value}`
              }
            : undefined,
          body: {
            ...(params.reason ? { reason: params.reason } : {})
          }
        }
      )

      return response.data
    } catch (error) {
      logger.warn(
        {
          projectId: params.projectId,
          modelId: params.modelId,
          error: ensureError(error).message
        },
        '停止模型转换/同步失败'
      )
      return null
    }
  }
}
