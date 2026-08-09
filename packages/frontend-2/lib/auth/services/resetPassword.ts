import { PasswordResetError } from '~~/lib/auth/errors/errors'

type RequestResetEmailParams = {
  email: string
  apiOrigin: string
}

type PasswordResetFinalizationParams = {
  password: string
  token: string
  apiOrigin: string
}

type ChangePasswordParams = {
  oldPassword: string
  newPassword: string
  apiOrigin: string
  authToken?: string
}

export async function requestResetEmail(params: RequestResetEmailParams) {
  const { email, apiOrigin } = params
  const url = apiOrigin
    ? new URL('/auth/pwdreset/request', apiOrigin).toString()
    : '/auth/pwdreset/request'
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  })

  const body = await res.text()
  if (res.status !== 200) {
    throw new PasswordResetError(body)
  }
}

export async function finalizePasswordReset(params: PasswordResetFinalizationParams) {
  const { password, token, apiOrigin } = params
  const url = apiOrigin
    ? new URL('/auth/pwdreset/finalize', apiOrigin).toString()
    : '/auth/pwdreset/finalize'
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tokenId: token, password })
  })

  const body = await res.text()
  if (res.status !== 200) {
    throw new PasswordResetError(body)
  }
}

export async function changePassword(params: ChangePasswordParams) {
  const { oldPassword, newPassword, apiOrigin, authToken } = params
  const url = apiOrigin
    ? new URL('/auth/pwdreset/change', apiOrigin).toString()
    : '/auth/pwdreset/change'
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
    },
    body: JSON.stringify({ oldPassword, newPassword })
  })

  const body = await res.text()
  if (res.status !== 200) {
    throw new PasswordResetError(body)
  }
}
