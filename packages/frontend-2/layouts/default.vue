<template>
  <div class="bg-[#E7EBEB]">
    <HeaderNavBar />
    <div class="h-dvh w-dvh overflow-hidden flex flex-col">
      <div class="relative flex h-[calc(100vh-1.25rem)]">
        <DashboardSidebar />
        <div class="size-full bg-[#E7EBEB] pt-[4.5rem] ml-3.5 mr-3.5 mt-2">
          <div
            style="border-radius: 26px"
            class="size-full bg-white overflow-hidden"
          >
            <main
              class="w-full h-full overflow-y-auto simple-scrollbar pt-0 lg:pt-0"
            >
              <div class="px-0 md:px-0 h-full">
                <slot />
              </div>
            </main>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
