import { md5 } from '../utils/md5.js'

export function resolveUserDistinctId(email: string): string {
  return '@' + md5(email.toLowerCase()).toUpperCase()
}

export function resolveServerDistinctId(serverHostname: string): string {
  return md5(serverHostname.toLowerCase()).toUpperCase()
}

export const resolveDistinctId = resolveUserDistinctId
