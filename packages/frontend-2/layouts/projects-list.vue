<template>
  <div class="bg-[#E7EBEB]">
    <HeaderNavBar />
    <div class="h-dvh w-dvh overflow-hidden flex flex-col">
      <div class="relative flex h-[calc(100vh-1.25rem)]">
        <DashboardSidebar />
        <div class="size-full bg-[#E7EBEB] pt-[4.5rem] ml-1.5 mr-1.5 mt-2">
          <main
            class="w-full h-full overflow-hidden"
          >
            <div class="px-0 md:px-2 h-full">
              <slot />
            </div>
          </main>
        </div>
      </div>
    </div>
  </div>
</template>
