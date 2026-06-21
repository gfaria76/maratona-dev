<template>
  <main class="auth-shell">
    <section class="auth-panel">
      <UIcon name="i-lucide-loader-circle" class="spin-icon" />
      <h1>Validando credencial</h1>
      <p>Concluindo o retorno seguro do Google. Você será redirecionado em instantes.</p>
    </section>
  </main>
</template>

<script setup lang="ts">
const user = useFirebaseUser()

watch(user, () => {
  if (user.value) {
    const email = String(user.value.email || '').toLowerCase()
    return navigateTo(email.endsWith('@ufms.br') ? '/prova' : '/?error=domain')
  }
}, { immediate: true })
</script>
