/**
 * Menu / model permission constants (kept in sync with speckle-server custom-role module
 * and Permissions/page.vue ALL_MENU_PERMS / ALL_MODEL_PERMS).
 */
export const ALL_MENU_PERMS = [
  '/projects',
  '/organization',
  '/permissions',
  '/logs',
  '/models',
  '/twin-scene'
] as const

export const ALL_MODEL_PERMS = [
  'canUpload',
  'canEdit',
  'canDownload',
  'canFile'
] as const

export type MenuPerm = (typeof ALL_MENU_PERMS)[number]
export type ModelPerm = (typeof ALL_MODEL_PERMS)[number]

export type UserPerms = {
  userId: string
  roleId: string | null
  roleName: string | null
  menuPerms: string[]
  modelPerms: string[]
  isCustomized: boolean
  isAdmin: boolean
}

/**
 * Prefixes that are gated by menuPerms. A route.path starting with any of these
 * requires the corresponding entry in menuPerms (unless the user is admin).
 */
export const PROTECTED_MENU_PREFIXES = [
  '/permissions',
  '/logs',
  '/organization',
  '/models',
  '/twin-scene'
] as const

/**
 * Paths that are always accessible to any authenticated user (even users without
 * a custom role assignment). '/projects' acts as the safe fallback landing page.
 */
export const PUBLIC_AUTH_PATHS = ['/', '/projects'] as const
