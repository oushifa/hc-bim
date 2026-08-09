import { useProcessProjectInvite } from '~/lib/projects/composables/projectManagement'

export const useProjectInviteManager = () => {
  const processInvite = useProcessProjectInvite()
  const loading = ref(false)

  const useInvite = async (params: {
    accept: boolean
    token: string
    projectId: string
    inviteId?: string
  }) => {
    const { token, accept, projectId, inviteId } = params
    if (!token?.length || !projectId?.length) return false

    loading.value = true
    const success = await processInvite(
      {
        projectId,
        accept,
        token
      },
      { inviteId }
    )
    loading.value = false

    if (!success) return false

    return !!success
  }

  return {
    useInvite,
    loading: computed(() => loading.value)
  }
}
