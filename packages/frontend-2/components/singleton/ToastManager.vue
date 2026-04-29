<template>
  <Teleport to="#toast-portal">
    <div
      aria-live="assertive"
      class="pointer-events-none fixed top-0 right-0 left-0 flex items-start justify-center px-4 py-6 z-[100]"
    >
      <Transition
        enter-active-class="transform ease-out duration-300 transition"
        enter-from-class="-translate-y-2 opacity-0"
        enter-to-class="translate-y-0 opacity-100"
        leave-active-class="transition ease-in duration-150"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="notification"
          class="flex pointer-events-auto w-full max-w-[22rem] overflow-hidden rounded-xl bg-white text-foreground shadow-lg border border-outline-2 p-3 pl-4"
        >
          <div class="flex gap-2 items-center w-full">
            <div
              class="shrink-0"
              :class="{
                'self-start mt-0.5': notification.description || notification.cta
              }"
            >
              <CircleCheck
                v-if="notification.type === ToastNotificationType.Success"
                class="text-success h-5 w-5"
                aria-hidden="true"
              />
              <CircleX
                v-else-if="notification.type === ToastNotificationType.Danger"
                class="text-danger h-5 w-5"
                aria-hidden="true"
              />
              <AlertCircle
                v-else-if="notification.type === ToastNotificationType.Warning"
                class="text-foreground-2 h-5 w-5"
                aria-hidden="true"
              />
              <Info
                v-else-if="notification.type === ToastNotificationType.Info"
                class="text-foreground-2 h-5 w-5"
                aria-hidden="true"
              />
            </div>
            <div class="w-full min-w-[10rem]">
              <p
                v-if="notification.title"
                class="text-foreground text-sm font-medium"
              >
                {{ notification.title }}
              </p>
              <p
                v-if="notification.description"
                class="text-foreground-2 text-xs leading-snug"
              >
                {{ notification.description }}
              </p>
              <div v-if="notification.cta">
                <a
                  :href="toUrl(notification.cta.url)"
                  class="text-primary text-sm underline"
                  @click="onCtaClick"
                >
                  {{ notification.cta.title }}
                </a>
              </div>
            </div>
            <button
              type="button"
              class="shrink-0 ml-auto p-1 rounded hover:bg-gray-100 transition-colors"
              :class="{
                'self-start -mt-0.5 -mr-0.5':
                  notification.description || notification.cta
              }"
              @click="dismiss"
            >
              <X class="h-4 w-4 text-foreground-2" />
            </button>
          </div>
        </div>
      </Transition>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { useGlobalToastManager } from '~~/lib/common/composables/toast'
import { ToastNotificationType } from '@speckle/ui-components'
import { X, CircleCheck, CircleX, AlertCircle, Info } from 'lucide-vue-next'

const { currentNotification, dismiss: dismissToast } = useGlobalToastManager()

const notification = computed(() => currentNotification.value)

const dismiss = () => {
  dismissToast()
}

const toUrl = (url: unknown): string | undefined => {
  if (!url) return undefined
  return typeof url === 'string' ? url : String(url)
}

const onCtaClick = (e: MouseEvent) => {
  const cta = notification.value?.cta as
    | { onClick?: (e: MouseEvent) => void }
    | undefined
  cta?.onClick?.(e)
  dismiss()
}
</script>
