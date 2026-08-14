<!-- eslint-disable vuejs-accessibility/no-autofocus -->
<template>
  <div class="flex flex-col items-center">
    <div class="w-full relative py-2 flex items-start gap-x-2">
      <UserAvatar :user="comment.author" hide-tooltip size="sm" class="!size-7" />
      <div class="pt-1 flex-1 min-w-0">
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center space-x-2 min-w-0">
            <span class="truncate text-body-2xs font-medium">
              {{ comment.author.name }}
            </span>
            <span
              v-tippy="createdAt.full"
              class="text-body-2xs truncate text-foreground-2"
            >
              {{ createdAt.relative }}
            </span>
          </div>
          <FormButton
            v-if="canEdit && !isEditing"
            size="sm"
            color="subtle"
            class="shrink-0"
            @click="startEditing"
          >
            编辑
          </FormButton>
        </div>
        <div
          class="truncate text-body-2xs text-foreground dark:text-foreground-2 flex flex-col pt-2"
        >
          <template v-if="isLimited">
            <ViewerResourcesLimitAlert limit-type="comment" :project="project" />
          </template>
          <template v-else-if="isEditing">
            <div class="flex flex-col gap-2">
              <ViewerCommentsEditor
                v-model="editValue"
                prompt="编辑评论"
                disable-drop-zone
                autofocus
                :disabled="isSaving"
                @submit="onSubmit"
              />
              <div class="flex justify-end gap-2">
                <FormButton size="sm" color="outline" :disabled="isSaving" @click="cancelEditing">
                  取消
                </FormButton>
                <FormButton size="sm" :loading="isSaving" @click="onSubmit">
                  保存
                </FormButton>
              </div>
            </div>
          </template>
          <template v-else>
            <CommonTiptapTextEditor
              v-if="comment?.text?.doc"
              :model-value="comment.text.doc"
              :schema-options="{ multiLine: false }"
              :project-id="projectId"
              disable-invitation-cta
              readonly
              @created="emit('mounted')"
            />
          </template>

          <ViewerAnchoredPointThreadCommentAttachments
            :attachments="comment"
            :project-id="projectId"
          />
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import type { ViewerCommentThreadFragment, ViewerCommentsReplyItemFragment } from '~~/lib/common/generated/gql/graphql'
import { useActiveUser } from '~~/lib/auth/composables/activeUser'
import {
  type CommentEditorValue,
  useEditComment
} from '~~/lib/viewer/composables/commentManagement'
import { convertCommentEditorValueToInput } from '~~/lib/viewer/helpers/comments'
import { useInjectedViewerState } from '~/lib/viewer/composables/setup'

const props = defineProps<{
  comment: ViewerCommentsReplyItemFragment | ViewerCommentThreadFragment
  projectId: string
}>()

const emit = defineEmits<{
  (e: 'mounted'): void
}>()

const {
  projectId: currentProjectId,
  resources: {
    response: { project }
  }
} = useInjectedViewerState()
const { activeUser } = useActiveUser()
const editComment = useEditComment()
const { formattedRelativeDate, formattedFullDate } = useDateFormatters()
const isEditing = ref(false)
const isSaving = ref(false)
const editValue = ref<CommentEditorValue>({
  doc: undefined,
  attachments: undefined
})

const createdAt = computed(() => {
  return {
    full: formattedFullDate(props.comment.createdAt),
    relative: formattedRelativeDate(props.comment.createdAt, { capitalize: true })
  }
})

const isLimited = computed(() => !props.comment.text)
const canEdit = computed(() => activeUser.value?.id === props.comment.author.id)
const existingBlobIds = computed(
  () => props.comment.text?.attachments?.map((attachment) => attachment.id) || []
)

const startEditing = () => {
  editValue.value = {
    doc: props.comment.text?.doc
      ? JSON.parse(JSON.stringify(props.comment.text.doc))
      : undefined,
    attachments: undefined
  }
  isEditing.value = true
}

const cancelEditing = () => {
  isEditing.value = false
}

const onSubmit = async () => {
  if (isSaving.value) return

  const content = convertCommentEditorValueToInput(editValue.value, {
    existingBlobIds: existingBlobIds.value
  })

  isSaving.value = true
  try {
    const updatedComment = await editComment({
      projectId: currentProjectId.value,
      commentId: props.comment.id,
      content
    })

    if (!updatedComment) return
    isEditing.value = false
  } finally {
    isSaving.value = false
  }
}
</script>
