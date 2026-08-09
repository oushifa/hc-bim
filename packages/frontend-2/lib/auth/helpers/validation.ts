import { stringContains } from '~~/lib/common/helpers/validation'
import { blockedDomains } from '@speckle/shared'

export const passwordLongEnough = stringContains({
  match: /^.{8,}$/,
  message: '至少 8 个字符'
})
export const passwordHasAtLeastOneNumber = stringContains({
  match: /\d/,
  message: '至少包含 1 个数字'
})
export const passwordHasAtLeastOneLowercaseLetter = stringContains({
  match: /[a-z]/,
  message: '至少包含 1 个小写字母'
})
export const passwordHasAtLeastOneUppercaseLetter = stringContains({
  match: /[A-Z]/,
  message: '至少包含 1 个大写字母'
})
export const doesNotContainBlockedDomain = (val: string) => {
  const domain = val.split('@')[1]?.toLowerCase()
  return domain && blockedDomains.includes(domain)
    ? 'Please use your work email instead of a personal email address'
    : true
}

export const passwordRules = [
  passwordLongEnough,
  passwordHasAtLeastOneNumber,
  passwordHasAtLeastOneLowercaseLetter,
  passwordHasAtLeastOneUppercaseLetter
]
