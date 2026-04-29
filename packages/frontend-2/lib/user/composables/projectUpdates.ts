import { useApolloClient, useSubscription } from '@vue/apollo-composable'
import { graphql } from '~/lib/common/generated/gql'
import { UserProjectsUpdatedMessageType } from '~/lib/common/generated/gql/graphql'
import { getCacheId, modifyObjectField } from '~/lib/common/helpers/graphql'

export function useUserProjectsUpdatedTracking() {
  const apollo = useApolloClient().client
  const { activeUser } = useActiveUser()

  const { onResult: onUserProjectsUpdate } = useSubscription(
    graphql(`
      subscription OnUserProjectsUpdate {
        userProjectsUpdated {
          type
          id
          project {
            ...ProjectDashboardItem
            workspaceId
          }
        }
      }
    `),
    {},
    () => ({
      errorPolicy: 'all'
    })
  )

  onUserProjectsUpdate((res) => {
    const activeUserId = activeUser.value?.id
    const event = res.data?.userProjectsUpdated

    if (!event) return
    if (!activeUserId) return

    const isNewProject = event.type === UserProjectsUpdatedMessageType.Added
    const incomingProject = event.project
    const cache = apollo.cache

    if (isNewProject && incomingProject) {
      // Add to User.projects where possible
      modifyObjectField(
        cache,
        getCacheId('User', activeUserId),
        'projects',
        ({ helpers: { ref, createUpdatedValue }, variables }) => {
          if (incomingProject.workspaceId && variables.filter?.personalOnly) {
            return // skip, not a personal project
          }
          if (
            variables.filter?.workspaceId &&
            variables.filter?.workspaceId !== incomingProject.workspaceId
          ) {
            return // skip, not in the workspace
          }

          return createUpdatedValue(({ update }) => {
            update('items', (items) => [
              ref('Project', incomingProject.id),
              ...(items || [])
            ])
            update('totalCount', (count) => count + 1)
          })
        },
        { autoEvictFiltered: true }
      )
    }

    if (!isNewProject) {
      // Evict old project from cache entirely to remove it from all searches
      cache.evict({
        id: getCacheId('Project', event.id)
      })
    }

    // 不再重复触发通知：创建/删除操作已由 useCreateProject / useDeleteProject 统一展示中文 Toast
  })
}
