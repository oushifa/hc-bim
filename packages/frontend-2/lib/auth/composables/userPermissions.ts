import type { UserPerms } from '~~/lib/auth/helpers/permissions'

/**
 * Shared composable for reading / refreshing the current user's effective
 * menu + model permissions from speckle-server's custom-role REST API.
 *
 * The raw state is stored via `useState` so it is shared across all components
 * and route middleware in the same SSR request / CSR session.
 */
export const useUserPermissions = () => {
  const apiOrigin = useApiOrigin()
  const state = useState<UserPerms | null>('userPermissions', () => null)

  const load = async (): Promise<UserPerms | null> => {
    try {
      const data = await $fetch<UserPerms>(
        `${apiOrigin}/api/v1/custom-roles/me/permissions`
      )
      state.value = data
      return data
    } catch (e) {
      // On error (e.g. 401 when not authenticated) treat the user as having no perms.
      state.value = null
      return null
    }
  }

  const ensureLoaded = async (): Promise<UserPerms | null> => {
    if (state.value) return state.value
    return await load()
  }

  const clear = () => {
    state.value = null
  }

  const hasMenu = (path: string): boolean => {
    const s = state.value
    if (!s) return false
    if (s.isAdmin) return true
    return s.menuPerms.includes(path)
  }

  const hasModelOp = (op: string): boolean => {
    const s = state.value
    if (!s) return false
    if (s.isAdmin) return true
    return s.modelPerms.includes(op)
  }

  const isAdmin = computed(() => !!state.value?.isAdmin)

  return {
    state,
    isAdmin,
    load,
    ensureLoaded,
    clear,
    hasMenu,
    hasModelOp
  }
}
