import {
  PROTECTED_MENU_PREFIXES,
  PUBLIC_AUTH_PATHS
} from '~~/lib/auth/helpers/permissions'
import { useUserPermissions } from '~~/lib/auth/composables/userPermissions'
import { projectsRoute } from '~~/lib/common/helpers/route'

/**
 * Gate route access by the current user's effective menuPerms (custom-role module).
 *
 * Rules:
 *  - Admin (server role `admin`) bypasses all checks.
 *  - PUBLIC_AUTH_PATHS (`/`, `/projects`) are always accessible to authenticated users.
 *  - A path starting with any PROTECTED_MENU_PREFIXES entry requires the matching
 *    menuPerms entry. Users without the permission are redirected to `/projects`.
 *
 * MUST be used after the `auth` middleware (which ensures the user is authenticated).
 */
export default defineNuxtRouteMiddleware(async (to) => {
  const { ensureLoaded, hasMenu } = useUserPermissions()
  const perms = await ensureLoaded()

  // If perm fetch failed (e.g. server unreachable), let auth middleware handle it.
  if (!perms) return

  if (perms.isAdmin) return

  if ((PUBLIC_AUTH_PATHS as readonly string[]).includes(to.path)) return

  const matched = PROTECTED_MENU_PREFIXES.find((prefix) => to.path.startsWith(prefix))
  if (!matched) return

  if (!hasMenu(matched)) {
    return navigateTo(projectsRoute)
  }
})
