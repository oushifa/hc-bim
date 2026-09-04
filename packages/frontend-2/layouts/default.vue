<template>
  <div class="bg-[#E7EBEB]">
    <HeaderNavBar />
    <div class="h-dvh w-full overflow-hidden flex flex-col">
      <div class="relative flex w-full h-[calc(100vh-1.25rem)]">
        <DashboardSidebar />
        <div class="size-full bg-[#E7EBEB] pt-[4.5rem] ml-3.5 mr-3.5 mt-2">
          <div
            style="border-radius: 26px"
            class="size-full bg-white overflow-hidden relative"
          >
            <main
              class="w-full h-full simple-scrollbar pt-0 lg:pt-0"
              :class="isTwinSceneRoute ? 'overflow-hidden' : 'overflow-y-auto'"
            >
              <div class="px-0 md:px-0 w-full h-full">
                <slot />
              </div>
            </main>
            <TwinSceneCasesKeeper />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
/** twin-scene 内嵌 iframe 路由（cases/members/settings）需要禁用外层滚动，避免与 iframe 内部滚动联动 */
const isTwinSceneRoute = computed(() => route.path.startsWith('/twin-scene'))
</script>
