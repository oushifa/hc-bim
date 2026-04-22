<template>
  <div class="bg-[#E7EBEB]">
    <HeaderNavBar />
    <div class="h-dvh w-dvh overflow-hidden flex flex-col">
      <div class="relative flex h-dvh">
        <SettingsSidebar />

        <main class="w-full h-full overflow-y-auto simple-scrollbar pt-[4.5rem] pb-6 lg:pb-8">
          <div class="container mx-auto px-6 md:px-8">
            <slot />
          </div>
        </main>
      </div>
    </div>
  </div>
</template>
