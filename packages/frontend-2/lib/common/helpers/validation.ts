/* eslint-disable @typescript-eslint/no-explicit-any */
import { ValidationHelpers } from '@speckle/ui-components'
import type { useForm } from 'vee-validate'
import { validateWorkspaceSlug, InvalidWorkspaceSlugError } from '@speckle/shared'

export const VALID_HTTP_URL = ValidationHelpers.VALID_HTTP_URL
export const VALID_EMAIL = ValidationHelpers.VALID_EMAIL

/**
 * Note about new validators:
 * Make sure you use the word "Value" to refer to the value being validated in all error messages, cause the dynamic string replace
 * that replaces that part with the actual field name works based on that
 */

/**
 * E-mail validation rule (not perfect, but e-mails should be validated by sending out confirmation e-mails anyway)
 */
export const isEmail = ValidationHelpers.isEmail

export const isEmailOrEmpty = ValidationHelpers.isEmailOrEmpty

export const isOneOrMultipleEmails = ValidationHelpers.isOneOrMultipleEmails

export const isRequired = ValidationHelpers.isRequired

export const isSameAs = ValidationHelpers.isSameAs

export const isStringOfLength = ValidationHelpers.isStringOfLength

export const stringContains = ValidationHelpers.stringContains

export const isUrl = ValidationHelpers.isUrl

export const isItemSelected = ValidationHelpers.isItemSelected

export const isMultiItemSelected = ValidationHelpers.isMultiItemSelected

/**
 * Wrapper over useForm's `resetForm` that fully resets the form and its initial values
 * @param veeValidateResetForm The `resetForm` function returned by vee-validate's `useForm`
 */
export function fullyResetForm(
  veeValidateResetForm: ReturnType<typeof useForm<any>>['resetForm']
) {
  veeValidateResetForm({ values: {} })
}

/**
 * Chinese mobile phone number validation rule (11 digits starting with 1)
 */
export const isPhone = (value: string) => {
  if (!value) return '手机号不能为空'
  if (!/^1[3-9]\d{9}$/.test(value)) return '请输入有效的手机号'
  return true
}

export const isValidWorkspaceSlug = (value: string) => {
  try {
    validateWorkspaceSlug(value)
    return true
  } catch (error) {
    if (error instanceof InvalidWorkspaceSlugError) {
      return error.message
    }
    return 'Invalid workspace slug'
  }
}
