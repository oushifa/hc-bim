<template>
  <form method="post" class="space-y-8" @submit="onSubmit">
    <!-- Username -->
    <div
      class="relative border-b border-gray-200 pb-2 focus-within:border-[#00b4b6] transition-colors"
    >
      <div class="absolute inset-y-0 left-0 flex items-center pointer-events-none pb-2">
        <svg
          class="h-5 w-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
      </div>
      <FormTextInput
        name="email"
        placeholder="请输入手机号"
        type="tel"
        size="lg"
        color="foundation"
        :rules="emailRules"
        :disabled="loading"
        class="pl-9 bg-transparent border-none focus:outline-none focus:ring-0"
      />
    </div>

    <!-- Password -->
    <div
      class="relative border-b border-gray-200 pb-2 focus-within:border-[#00b4b6] transition-colors"
    >
      <div class="absolute inset-y-0 left-0 flex items-center pointer-events-none pb-2">
        <svg
          class="h-5 w-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
      </div>
      <FormTextInput
        type="password"
        name="password"
        placeholder="请输入密码"
        color="foundation"
        size="lg"
        :rules="passwordRules"
        :disabled="loading"
        autocomplete="current-password"
        class="pl-9 bg-transparent border-none focus:outline-none focus:ring-0"
      />
    </div>

    <!-- Submit Button -->
    <button
      type="submit"
      class="w-full mt-8 py-3.5 px-4 rounded-full shadow-md text-base font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover-button"
      :disabled="loading || !isMounted"
      style="background-color: #00b4b6"
    >
      登录
    </button>
  </form>
</template>

<script setup lang="ts">
import { useForm } from 'vee-validate'
import { isPhone, isRequired } from '~~/lib/common/helpers/validation'
import { ToastNotificationType, useGlobalToast } from '~~/lib/common/composables/toast'
import { ensureError } from '@speckle/shared'
import { useAuthManager } from '~~/lib/auth/composables/auth'
import { useMounted } from '@vueuse/core'
import { graphql } from '~/lib/common/generated/gql'
import type { AuthLoginWithEmailBlock_PendingWorkspaceCollaboratorFragment } from '~/lib/common/generated/gql/graphql'
import { useLog } from '~~/composables/useLog'

type FormValues = { email: string; password: string }

graphql(`
  fragment AuthLoginWithEmailBlock_PendingWorkspaceCollaborator on PendingWorkspaceCollaborator {
    id
    email
    user {
      id
    }
  }
`)

const props = defineProps<{
  challenge: string
  workspaceInvite?: AuthLoginWithEmailBlock_PendingWorkspaceCollaboratorFragment
}>()

const { handleSubmit, setValues } = useForm<FormValues>()

const loading = ref(false)
const emailRules = [isPhone]
const passwordRules = [isRequired]

const isMounted = useMounted()
const { loginWithEmail } = useAuthManager()
const { triggerNotification } = useGlobalToast()
const { track, flush } = useLog()

const inviteEmail = computed(() => props.workspaceInvite?.email)
const isInviteForExistingUser = computed(() => !!props.workspaceInvite?.user)
const shouldForceInviteEmail = computed(
  () => !!(inviteEmail.value && isInviteForExistingUser.value)
)

const onSubmit = handleSubmit(async ({ email, password }) => {
  try {
    loading.value = true
    await loginWithEmail({
      email,
      password,
      challenge: props.challenge
    })
  } catch (e) {
    const err = ensureError(e)
    triggerNotification({
      type: ToastNotificationType.Danger,
      title: '登录失败',
      description: err.message
    })
  } finally {
    loading.value = false
  }
})

watch(
  shouldForceInviteEmail,
  (shouldForce) => {
    if (shouldForce) {
      setValues({ email: inviteEmail.value || '' })
    }
  },
  { immediate: true }
)
</script>
<style scoped>
.hover-button:hover {
  background-color: #009fa1 !important;
}

:deep(input:focus),
:deep(input:focus-visible) {
  outline: none !important;
  box-shadow: none !important;
}

:deep(input:-webkit-autofill),
:deep(input:-webkit-autofill:hover),
:deep(input:-webkit-autofill:focus),
:deep(input:-webkit-autofill:active) {
  -webkit-box-shadow: 0 0 0 1000px transparent inset !important;
  -webkit-text-fill-color: inherit !important;
  transition: background-color 9999s ease-out 0s;
}
</style>
