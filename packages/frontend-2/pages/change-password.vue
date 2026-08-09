<template>
  <section class="min-h-[calc(100vh-4rem)] px-4 py-8 md:px-6 md:py-12">
    <div class="mx-auto w-full max-w-xl">
      <div class="rounded-xl border border-outline-3 bg-foundation-page p-6 md:p-8">
        <div class="mb-6">
          <h1 class="text-heading-lg text-foreground">更改密码</h1>
          <p class="mt-2 text-body-xs text-foreground-2">
            修改成功后，系统会自动退出当前账号，您需要使用新密码重新登录。
          </p>
        </div>

        <form class="flex flex-col gap-y-4" @submit="onSubmit">
          <FormTextInput
            v-model="oldPassword"
            color="foundation"
            type="password"
            name="oldPassword"
            label="当前密码"
            placeholder="请输入当前密码"
            show-label
            :rules="[isRequired]"
          />

          <FormTextInput
            v-model="newPassword"
            color="foundation"
            type="password"
            name="newPassword"
            label="新密码"
            placeholder="请输入新密码"
            show-label
            :rules="[isRequired, ...passwordRules]"
          />

          <FormTextInput
            v-model="confirmPassword"
            color="foundation"
            type="password"
            name="confirmPassword"
            label="确认新密码"
            placeholder="请再次输入新密码"
            show-label
            :rules="[isRequired, isSameAsNewPassword]"
          />

          <div class="rounded-lg border border-outline-3 bg-foundation p-4">
            <p class="mb-3 text-body-xs font-medium text-foreground">密码要求</p>
            <AuthPasswordChecks :password="newPassword" />
          </div>

          <div class="flex gap-2 pt-2">
            <FormButton submit :disabled="loading">保存新密码</FormButton>
            <FormButton color="outline" :to="homeRoute">返回首页</FormButton>
          </div>
        </form>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { GenericValidateFunction } from 'vee-validate'
import { useForm } from 'vee-validate'
import { usePasswordReset } from '~~/lib/auth/composables/passwordReset'
import { passwordRules } from '~~/lib/auth/helpers/validation'
import { homeRoute } from '~~/lib/common/helpers/route'
import { isRequired } from '~~/lib/common/helpers/validation'

type FormValues = {
  oldPassword: string
  newPassword: string
  confirmPassword: string
}

definePageMeta({
  middleware: ['auth']
})

useHead({
  title: '更改密码'
})

const { handleSubmit } = useForm<FormValues>()
const { changePassword, loading } = usePasswordReset()

const oldPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')

const isSameAsNewPassword: GenericValidateFunction<string> = (value, meta) =>
  value === (meta.form.newPassword as string) ? true : '两次输入的新密码不一致'

const onSubmit = handleSubmit(async ({ oldPassword, newPassword }) => {
  await changePassword(oldPassword, newPassword)
})
</script>
