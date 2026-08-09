import { useMutation } from '@vue/apollo-composable'
import type { UpdateSavedViewInput } from '~/lib/common/generated/gql/graphql'
import { updatePresentationSlideMutation } from '~/lib/presentations/graphql/mutations'
import type { MaybeNullOrUndefined } from '@speckle/shared'

export const useUpdatePresentationSlide = () => {
  const { mutate, loading } = useMutation(updatePresentationSlideMutation)
  return {
    mutate: async (params: {
      input: UpdateSavedViewInput
      workspaceId: MaybeNullOrUndefined<string>
    }) => {
      const { input, workspaceId } = params
      const result = await mutate({ input })

      if (result?.data?.projectMutations.savedViewMutations.updateView) {
      }

      return result
    },
    loading
  }
}
