<template>
  <div v-if="!isLoggedIn" class="min-h-screen flex font-sans bg-white overflow-hidden">
    <!-- Left Side - Login Form -->
    <div class="w-1/2 flex flex-col relative bg-white z-10 shadow-2xl shrink-0">
      <!-- Top Left Logo -->
      <div class="absolute top-8 left-10 z-20 flex items-center space-x-3">
        <img
          src="https://siruijie.oss-cn-beijing.aliyuncs.com/test/logo.png"
          alt="Logo"
          class="h-10 w-auto object-contain"
          referrerpolicy="no-referrer"
        />
        <span class="text-2xl font-bold text-gray-800 tracking-widest drop-shadow-sm">
          海创制造
        </span>
      </div>

      <div class="flex-1 flex items-center justify-center p-12 mt-16">
        <div class="w-full max-w-[380px]">
          <div class="text-center mb-10">
            <h2 class="text-2xl font-medium text-[#00b4b6] tracking-widest">
              用户登录
            </h2>
          </div>

          <div class="flex flex-col gap-4">
            <AuthLoginWithEmailBlock
              :challenge="challenge"
              :workspace-invite="workspaceInvite || undefined"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Right Side - Branding & Imagery -->
    <div
      class="hidden lg:flex w-1/2 bg-[#00b4b6] relative overflow-hidden items-center justify-center flex-col text-white"
    >
      <!-- Semi-transparent digital twin background images -->
      <div
        class="absolute inset-0 opacity-40 mix-blend-overlay"
        :style="backgroundStyle"
      />

      <!-- Content -->
      <div class="relative z-10 w-full px-16 text-left">
        <h1 class="text-5xl xl:text-6xl font-bold tracking-widest mb-6 drop-shadow-lg">
          海创制造
        </h1>
        <p
          class="text-xl xl:text-2xl font-light tracking-widest opacity-90 drop-shadow-md"
        >
          引领数字孪生，共创智慧未来
        </p>
      </div>
    </div>
  </div>
  <div v-else />
</template>
<script setup lang="ts">
import { useQuery } from '@vue/apollo-composable'
import { AuthStrategy } from '~~/lib/auth/helpers/strategies'
import { useLoginOrRegisterUtils, useAuthManager } from '~~/lib/auth/composables/auth'
import { LayoutDialog } from '@speckle/ui-components'
import { ssoLoginRoute } from '~~/lib/common/helpers/route'
import {
  authLoginPanelQuery,
  authLoginPanelWorkspaceInviteQuery
} from '~/lib/auth/graphql/queries'

const props = withDefaults(
  defineProps<{
    dialogMode?: boolean
    title?: string
    subtitle?: string
  }>(),
  {
    dialogMode: false,
    title: 'BIM 登录'
  }
)

const { appId, challenge } = useLoginOrRegisterUtils()
const { isLoggedIn } = useActiveUser()
const { inviteToken } = useAuthManager()
const isWorkspacesEnabled = useIsWorkspacesEnabled()
const isSsoEnabled = useIsWorkspacesSsoEnabled()

const { result } = useQuery(authLoginPanelQuery)

const { result: workspaceInviteResult } = useQuery(
  authLoginPanelWorkspaceInviteQuery,
  () => ({
    token: inviteToken.value
  }),
  () => ({
    enabled: isWorkspacesEnabled.value
  })
)

const concreteComponent = computed(() => {
  return props.dialogMode ? LayoutDialog : 'div'
})

const workspaceInvite = computed(() => workspaceInviteResult.value?.workspaceInvite)

const serverInfo = computed(() => result.value?.serverInfo)
const hasLocalStrategy = computed(() =>
  (serverInfo.value?.authStrategies || []).some((s) => s.id === AuthStrategy.Local)
)

const hasThirdPartyStrategies = computed(() =>
  serverInfo.value?.authStrategies.some((s) => s.id !== AuthStrategy.Local)
)

const backgroundStyle = computed(() => ({
  backgroundImage:
    'url(https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?q=80&w=2070&auto=format&fit=crop)',
  backgroundSize: 'cover',
  backgroundPosition: 'center'
}))
</script>
