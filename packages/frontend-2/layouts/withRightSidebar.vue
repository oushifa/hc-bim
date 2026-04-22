<template>
  <div class="bg-[#E7EBEB]">
    <HeaderNavBar />
    <div class="h-dvh w-dvh overflow-hidden flex flex-col">
      <div class="relative flex h-dvh">
        <DashboardSidebar />
        <div class="size-full pt-[4.5rem]">
          <slot />
        </div>
      </div>
    </div>
  </div>
</template>
