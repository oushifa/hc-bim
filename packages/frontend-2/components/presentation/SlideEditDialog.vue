<template>
  <LayoutDialog v-model:open="open" max-width="sm" :buttons="dialogButtons">
    <template #header>Edit slide</template>
    <form @submit="onSubmit">
      <div class="flex flex-col gap-2">
        <img
          :src="thumbnailUrlWithToken"
          :alt="slide?.name"
          class="w-full object-cover rounded-lg border border-outline-3 h-64"
        />
        <FormTextInput
          v-model="name"
          name="name"
          label="Name"
          placeholder="Add a name..."
          color="foundation"
          :rules="[isRequired]"
        />
        <FormTextArea
          v-model="description"
          name="description"
          label="Description"
          color="foundation"
          placeholder="Add a description..."
        />
      </div>
    </form>
  </LayoutDialog>
</template>
<script setup lang="ts">
import type { LayoutDialogButton } from '@speckle/ui-components'
import { graphql } from '~~/lib/common/generated/gql'
import type { PresentationSlideEditDialog_SavedViewFragment } from '~/lib/common/generated/gql/graphql'
import type { MaybeNullOrUndefined } from '@speckle/shared'
import { isRequired } from '~/lib/common/helpers/validation'
import { useUpdatePresentationSlide } from '~/lib/presentations/composables/mangament'
import { useForm } from 'vee-validate'
import { useAuthManager } from '~~/lib/auth/composables/auth'
import { useInternalUrlUtils } from '~~/lib/common/composables/url'

graphql(`
  fragment PresentationSlideEditDialog_SavedView on SavedView {
    id
    projectId
    name
    description
    thumbnailUrl
  }
`)

const props = defineProps<{
  slide: MaybeNullOrUndefined<PresentationSlideEditDialog_SavedViewFragment>
  workspaceId: MaybeNullOrUndefined<string>
}>()

const open = defineModel<boolean>('open', { required: true })

const { mutate: updateSlide, loading } = useUpdatePresentationSlide()
const { handleSubmit } = useForm()
const { presentationToken } = useAuthManager()
const { toRelativeInternalUrl, updateUrlSearchParams } = useInternalUrlUtils()

const name = ref<string>('')
const description = ref<string>('')

const thumbnailUrlWithToken = computed(() => {
  if (!props.slide?.thumbnailUrl) return props.slide?.thumbnailUrl

  const thumbnailUrl =
    toRelativeInternalUrl(props.slide.thumbnailUrl) || props.slide.thumbnailUrl
  if (!presentationToken.value) return thumbnailUrl

  return updateUrlSearchParams(thumbnailUrl, (searchParams) => {
    searchParams.set('embedToken', presentationToken.value as string)
  })
})

const onSubmit = handleSubmit(async () => {
  if (!props.slide?.id) return

  await updateSlide({
    input: {
      id: props.slide.id,
      projectId: props.slide.projectId,
      name: name.value,
      description: description.value
    },
    workspaceId: props.workspaceId
  })

  open.value = false
})

const dialogButtons = computed((): LayoutDialogButton[] => {
  return [
    {
      text: 'Cancel',
      props: { color: 'outline' },
      onClick: () => {
        open.value = false
      }
    },
    {
      text: 'Save',
      props: { loading: loading.value },
      onClick: onSubmit
    }
  ]
})

watch(
  () => open.value,
  () => {
    name.value = props.slide?.name || ''
    description.value = props.slide?.description || ''
  },
  { immediate: true }
)
</script>
