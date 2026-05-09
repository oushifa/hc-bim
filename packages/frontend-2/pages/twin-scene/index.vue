<template>
  <div class="h-full" />
</template>

<script setup lang="ts">
import { twinSceneCasesRoute } from '~/lib/common/helpers/route'

definePageMeta({
  middleware: ['auth', 'permission']
})

await navigateTo(twinSceneCasesRoute('workgroup-1'), { replace: true })
</script>
