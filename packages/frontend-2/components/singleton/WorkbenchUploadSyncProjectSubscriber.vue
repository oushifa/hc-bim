<script setup lang="ts">
import type { OnProjectVersionsUpdateSubscription } from '~/lib/common/generated/gql/graphql'
import { ProjectVersionsUpdatedMessageType } from '~/lib/common/generated/gql/graphql'
import { useWorkbenchUploadSync } from '~/lib/projects/composables/workbenchUploadSync'
import { useProjectVersionUpdateTracking } from '~/lib/projects/composables/versionManagement'

const props = defineProps<{
  projectId: string
  onVersionUpdate?: () => void
}>()

const { consumeVersionCreated } = useWorkbenchUploadSync()

useProjectVersionUpdateTracking(
  computed(() => props.projectId),
  (
    event: NonNullable<OnProjectVersionsUpdateSubscription['projectVersionsUpdated']>
  ) => {
    if (!event.version) {
      return
    }

    if (
      event.type === ProjectVersionsUpdatedMessageType.Created ||
      event.type === ProjectVersionsUpdatedMessageType.Updated
    ) {
      props.onVersionUpdate?.()
    }

    if (event.type === ProjectVersionsUpdatedMessageType.Created) {
      void consumeVersionCreated({
        projectId: props.projectId,
        version: event.version
      })
    }
  },
  {
    silenceToast: true
  }
)
</script>
