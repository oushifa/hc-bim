<template>
  <div class="fixed inset-0 z-50 bg-white">
    <AuthLoginPanel />
  </div>
</template>
<script setup lang="ts">
import { useMixpanel } from '~~/lib/core/composables/mp'

const mixpanel = useMixpanel()

useHead({ title: '登录' })

onMounted(() => {
  mixpanel.track('Visit Log In')
})

definePageMeta({
  name: 'login',
  layout: false
})
</script>
