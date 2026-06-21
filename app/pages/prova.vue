<template>
  <main class="arena-bg prova-page">
    <div class="arena-grid" />

    <section v-if="blockedMessage" class="blocked-shell arena-card">
      <UIcon name="i-lucide-shield-alert" class="blocked-icon" />
      <p class="arena-kicker">Acesso bloqueado</p>
      <h1>{{ blockedMessage }}</h1>
      <p>Procure o professor para revisar sua sessão ou liberar seu IP.</p>
      <UButton icon="i-lucide-arrow-left" color="neutral" variant="outline" label="Voltar" to="/" />
    </section>

    <ExamLayout v-else-if="ready" />

    <section v-else class="blocked-shell arena-card">
      <UIcon name="i-lucide-loader-circle" class="blocked-icon spin-icon" />
      <p class="arena-kicker">Preparando arena</p>
      <h1>Verificando login, IP e sessão</h1>
      <p>A prova começa assim que os controles forem validados.</p>
    </section>
  </main>
</template>

<script setup lang="ts">

definePageMeta({
  middleware: 'auth',
})

const exam = useExamStore()
const { provaIniciada } = storeToRefs(exam)
const ready = ref(false)
const blockedMessage = ref('')

const blockMessages: Record<string, string> = {
  ip_not_allowed: 'Este IP não está em uma faixa autorizada.',
  blocked_ip: 'Este IP está bloqueado para a prova.',
  same_user_new_ip: 'Sua conta tentou iniciar a prova por mais de um IP.',
  same_ip_other_user: 'Este IP já está vinculado a outro usuário em prova.',
}

onMounted(async () => {
  try {
    const access = await exam.verificarAcesso()
    if (!access.allowed) {
      blockedMessage.value = blockMessages[access.reason] || 'Sua sessão não foi autorizada.'
      return
    }

    await Promise.all([
      exam.carregarConfig(),
      exam.carregarQuestoes(),
    ])

    if (!provaIniciada.value) {
      exam.iniciarProva()
    }

    ready.value = true
    await requestFullscreen()
    registerSecurityListeners()
  } catch (e: any) {
    blockedMessage.value = e?.data?.message || 'Não foi possível validar sua sessão.'
  }
})

onBeforeUnmount(() => {
  unregisterSecurityListeners()
})

async function requestFullscreen() {
  try {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen()
    }
  } catch {
    await exam.reportarEventoSeguranca('fullscreen_exit', { reason: 'fullscreen_request_denied' })
  }
}

function registerSecurityListeners() {
  document.addEventListener('fullscreenchange', handleFullscreenChange)
  document.addEventListener('visibilitychange', handleVisibilityChange)
  window.addEventListener('blur', handleBlur)
  window.addEventListener('focus', handleFocus)
}

function unregisterSecurityListeners() {
  document.removeEventListener('fullscreenchange', handleFullscreenChange)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  window.removeEventListener('blur', handleBlur)
  window.removeEventListener('focus', handleFocus)
}

function handleFullscreenChange() {
  if (!document.fullscreenElement) {
    exam.reportarEventoSeguranca('fullscreen_exit')
  }
}

function handleVisibilityChange() {
  exam.reportarEventoSeguranca(document.hidden ? 'visibility_hidden' : 'visibility_visible')
}

function handleBlur() {
  exam.reportarEventoSeguranca('window_blur')
}

function handleFocus() {
  exam.reportarEventoSeguranca('window_focus')
}
</script>

<style scoped>
.prova-page {
  position: relative;
  min-height: 100dvh;
}

.blocked-shell {
  position: relative;
  z-index: 1;
  display: flex;
  width: min(560px, calc(100% - 32px));
  min-height: 320px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  margin: 0 auto;
  padding: 32px;
  text-align: center;
  transform: translateY(calc(50dvh - 50%));
}

.blocked-shell h1 {
  font-size: 28px;
  font-weight: 900;
}

.blocked-shell p:not(.arena-kicker) {
  color: rgba(244, 247, 251, 0.68);
}

.blocked-icon {
  width: 52px;
  height: 52px;
  color: #ff4d8f;
}
</style>
