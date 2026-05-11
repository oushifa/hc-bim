<template>
  <div>
    <nav
      class="fixed z-40 top-3 left-3 right-3 lg:left-[17.6rem] h-14 rounded-[26px] border border-white/40 bg-white/80 backdrop-blur-[151.88px] shadow-[0px_60px_60px_-30px_rgba(64,74,72,0.2)] text-[#333]"
    >
      <div
        class="absolute inset-0 z-[-1] opacity-80"
        style="background-image: url(https://i.imgur.com/29tpvW8.png); background-size: cover; background-position: bottom;"
      />
      <div
        class="flex gap-4 items-center justify-between h-full w-full px-4 lg:px-6"
      >
        <div class="hidden lg:block lg:w-44 shrink-0" />
        <div class="flex items-center truncate gap-6">
          <!-- <FormButton color="outline" class="!border-transparent bg-[#f5f7fa] !text-[#666] hover:!text-[#00b4b6] hover:!bg-white">
            BIM赋能
          </FormButton> -->
          <!-- <ClientOnly>
            <PortalTarget name="mobile-navigation"></PortalTarget>
          </ClientOnly>
          <ClientOnly>
            <PortalTarget name="navigation"></PortalTarget>
          </ClientOnly> -->
        </div>
        <div class="flex items-center justify-end gap-2.5 sm:gap-2 lg:w-44">
          <ClientOnly>
            <PortalTarget name="secondary-actions"></PortalTarget>
            <PortalTarget name="primary-actions"></PortalTarget>
          </ClientOnly>
          <HeaderNavNotifications v-if="isLoggedIn" />
          <div v-if="!hideUserNav" class="flex justify-end items-center gap-x-2">
            <FormButton
              v-if="!activeUser"
              :to="loginUrl.fullPath"
              color="outline"
              class="hidden md:flex"
            >
              登录
            </FormButton>
            <!-- Profile dropdown -->
            <HeaderNavUserMenu :login-url="loginUrl" />
          </div>
        </div>
      </div>
    </nav>
    <PopupsSignIn v-if="!activeUser" />
  </div>
</template>
<script setup lang="ts">
import { useActiveUser } from '~~/lib/auth/composables/activeUser'
import { loginRoute } from '~~/lib/common/helpers/route'
import type { Optional } from '@speckle/shared'

defineProps<{
  hideUserNav?: boolean
}>()

const isWorkspacesEnabled = useIsWorkspacesEnabled()
const { activeUser, isLoggedIn } = useActiveUser()
const route = useRoute()
const router = useRouter()

const token = computed(() => route.query.token as Optional<string>)

const loginUrl = computed(() =>
  router.resolve({
    path: loginRoute,
    query: {
      token: token.value || undefined
    }
  })
)
</script>
