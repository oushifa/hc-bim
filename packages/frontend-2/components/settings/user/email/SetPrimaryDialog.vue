<template>
  <LayoutDialog
    v-model:open="isOpen"
    title="更改主要电子邮件地址"
    max-width="xs"
    :buttons="dialogButtons"
  >
    <p class="text-body-xs text-foreground mb-2">
      您确定要将
      <span class="font-medium">{{ email }}</span>
      设置为主要电子邮件吗？
    </p>
  </LayoutDialog>
</template>

<script setup lang="ts">
import type { LayoutDialogButton } from '@speckle/ui-components'
import { useGlobalToast, ToastNotificationType } from '~~/lib/common/composables/toast'
import { settingsSetPrimaryUserEmailMutation } from '~/lib/settings/graphql/mutations'
import { useMutation } from '@vue/apollo-composable'
import {
  getFirstErrorMessage,
  convertThrowIntoFetchResult
} from '~~/lib/common/helpers/graphql'

const props = defineProps<{
  emailId: string
  email: string
}>()
const isOpen = defineModel<boolean>('open', { required: true })

const { triggerNotification } = useGlobalToast()
const { mutate: updateMutation } = useMutation(settingsSetPrimaryUserEmailMutation)

const dialogButtons = computed((): LayoutDialogButton[] => [
  {
    text: '取消',
    props: { color: 'outline', outline: true },
    onClick: () => {
      isOpen.value = false
    }
  },
  {
    text: '设置为主要电子邮件',
    props: { color: 'primary' },
    onClick: () => {
      onSetPrimary()
      isOpen.value = false
    }
  }
])

const onSetPrimary = async () => {
  const result = await updateMutation({ input: { id: props.emailId } }).catch(
    convertThrowIntoFetchResult
  )
  if (result?.data) {
    triggerNotification({
      type: ToastNotificationType.Success,
      title: `Made ${props.email} primary`
    })

    const errorMessage = getFirstErrorMessage(result?.errors)
    triggerNotification({
      type: ToastNotificationType.Danger,
      title: errorMessage || '设置主要电子邮件失败'
    })
  }
}
</script>
