import { getDtpUIOrigin } from './useDtpIframeSrc'

/** WDP 编辑器保存请求消息类型（外部网站 → iframe） */
export const WDP_EDITOR_SAVE = 'WDP_EDITOR_SAVE'
/** WDP 编辑器保存结果回执消息类型（iframe → 外部网站） */
export const WDP_EDITOR_SAVE_RESULT = 'WDP_EDITOR_SAVE_RESULT'

/** WDP 保存成功后的回执数据 */
export type WdpSaveResult = {
  type: typeof WDP_EDITOR_SAVE_RESULT
  requestId?: string
  success: true
  message: string
}

/** WDP 保存失败错误码 */
export const WdpSaveErrorCode = {
  /** 编辑器未就绪（未进入编辑状态，无需保存） */
  EDITOR_NOT_READY: 'EDITOR_NOT_READY',
  /** 等待回执超时 */
  TIMEOUT: 'TIMEOUT',
  /** 三方返回 success:false（编辑器已就绪但保存异常） */
  SAVE_FAILED: 'SAVE_FAILED'
} as const
export type WdpSaveErrorCode = (typeof WdpSaveErrorCode)[keyof typeof WdpSaveErrorCode]

/** WDP 保存失败异常，携带错误码供调用方区分处理 */
export class WdpSaveError extends Error {
  code: WdpSaveErrorCode

  constructor(code: WdpSaveErrorCode, message: string) {
    super(message)
    this.name = 'WdpSaveError'
    this.code = code
  }
}

/** 三方回执中"编辑器未就绪"的 message 值（2.md 协议约定） */
const EDITOR_NOT_READY_MESSAGE = 'editor not ready'

type WdpSaveResponse = {
  type?: string
  requestId?: string
  success?: boolean
  message?: string
}

/**
 * 向 WDP 主站 iframe 发送保存通知并等待回执（Promise 封装）
 *
 * 协议（三方平台文档 2.md）：
 * - 发送 { type: 'WDP_EDITOR_SAVE', requestId } 到 iframe
 * - iframe 内主站执行完整保存流程后回执
 *   { type: 'WDP_EDITOR_SAVE_RESULT', requestId, success, message }
 *
 * 通过 requestId 配对回执，避免并发请求串号；超时未收到回执时 reject；
 * 回执 origin 与 DTP UI origin 不一致时忽略（防止伪造消息）。
 */
export function wdpSave(
  frameWindow: Window,
  options: { timeout?: number } = {}
): Promise<WdpSaveResult> {
  const { timeout = 15000 } = options
  const targetOrigin = getDtpUIOrigin()

  return new Promise((resolve, reject) => {
    const requestId = 'req-' + Date.now() + '-' + Math.random().toString(36).slice(2)

    const timer = setTimeout(() => {
      window.removeEventListener('message', onMessage)
      reject(new WdpSaveError(WdpSaveErrorCode.TIMEOUT, 'WDP 保存超时'))
    }, timeout)

    function onMessage(e: MessageEvent) {
      if (targetOrigin && e.origin !== targetOrigin) return
      if (e.source !== frameWindow) return
      const data = (e.data ?? {}) as WdpSaveResponse
      if (data.type !== WDP_EDITOR_SAVE_RESULT) return
      if (data.requestId !== requestId) return

      clearTimeout(timer)
      window.removeEventListener('message', onMessage)

      if (data.success) {
        resolve({
          type: WDP_EDITOR_SAVE_RESULT,
          requestId,
          success: true,
          message: data.message ?? ''
        })
      } else {
        const message = data.message || 'WDP 保存失败'
        reject(
          message === EDITOR_NOT_READY_MESSAGE
            ? new WdpSaveError(WdpSaveErrorCode.EDITOR_NOT_READY, message)
            : new WdpSaveError(WdpSaveErrorCode.SAVE_FAILED, message)
        )
      }
    }

    window.addEventListener('message', onMessage)
    frameWindow.postMessage({ type: WDP_EDITOR_SAVE, requestId }, targetOrigin)
  })
}
