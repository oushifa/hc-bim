import { ensureError } from '@speckle/shared'
import { useAuthManager } from '~~/lib/auth/composables/auth'
import {
  changePassword as changePasswordRequest,
  requestResetEmail,
  finalizePasswordReset
} from '~~/lib/auth/services/resetPassword'
import { ToastNotificationType, useGlobalToast } from '~~/lib/common/composables/toast'

export function usePasswordReset() {
  const apiOrigin = useApiOrigin()
  const { triggerNotification } = useGlobalToast()
  const { logout, effectiveAuthToken } = useAuthManager()

  const loading = ref(false)

  const sendResetEmail = async (email: string) => {
    try {
      loading.value = true
      await requestResetEmail({ email, apiOrigin })
      triggerNotification({
        type: ToastNotificationType.Info,
        title: 'Password reset email sent',
        description: `If the email address '${email}' is associated with a registered user, we have sent password reset instructions to that address.`
      })
    } catch (e) {
      triggerNotification({
        type: ToastNotificationType.Danger,
        title: 'Password reset failed',
        description: `${ensureError(e).message}`
      })
    } finally {
      loading.value = false
    }
  }

  const finalize = async (password: string, token: string) => {
    try {
      loading.value = true
      await finalizePasswordReset({ password, token, apiOrigin })
      triggerNotification({
        type: ToastNotificationType.Success,
        title: 'Password successfully changed',
        description: `You can now log in with your new password`
      })
      await logout({ skipToast: true })
    } catch (e) {
      triggerNotification({
        type: ToastNotificationType.Danger,
        title: 'Password change failed',
        description: `${ensureError(e).message}`
      })
    } finally {
      loading.value = false
    }
  }

  const changePassword = async (oldPassword: string, newPassword: string) => {
    try {
      loading.value = true
      await changePasswordRequest({
        oldPassword,
        newPassword,
        apiOrigin,
        authToken: effectiveAuthToken.value || undefined
      })
      triggerNotification({
        type: ToastNotificationType.Success,
        title: '密码修改成功',
        description: '请使用新密码重新登录'
      })
      await logout({ skipToast: true })
    } catch (e) {
      triggerNotification({
        type: ToastNotificationType.Danger,
        title: '密码修改失败',
        description: `${ensureError(e).message}`
      })
    } finally {
      loading.value = false
    }
  }

  return { sendResetEmail, finalize, changePassword, loading }
}
