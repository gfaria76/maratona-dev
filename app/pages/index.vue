<template>
  <main class="arena-bg login-page">
    <div class="arena-grid" />

    <section class="login-shell">
      <div class="brand-block">
        <p class="arena-kicker">Arena UFMS // Python</p>
        <h1 class="arena-gradient-text">Prova Python</h1>
        <p class="brand-copy">
          Entre com sua conta institucional, confirme a rede autorizada e comece a prova em modo monitorado.
        </p>
      </div>

      <div class="arena-card mission-panel">
        <div class="panel-header">
          <div>
            <p class="arena-kicker">Briefing</p>
            <h2>{{ config?.titulo || 'Carregando prova' }}</h2>
          </div>
          <UBadge color="primary" variant="soft">{{ totalQuestoes }} questões</UBadge>
        </div>

        <p class="welcome-copy">
          {{ config?.mensagem_boas_vindas || 'Aguarde enquanto preparamos a arena.' }}
        </p>

        <div class="mission-stats">
          <div>
            <UIcon name="i-lucide-clock-3" />
            <span>{{ config?.duracao_minutos || '---' }} min</span>
          </div>
          <div>
            <UIcon name="i-lucide-shield-check" />
            <span>IP monitorado</span>
          </div>
          <div>
            <UIcon name="i-lucide-maximize" />
            <span>Tela cheia</span>
          </div>
        </div>

        <UAlert
          v-if="errorMessage"
          color="error"
          variant="soft"
          icon="i-lucide-triangle-alert"
          title="Acesso recusado"
          :description="errorMessage"
        />

        <div v-if="user" class="user-strip">
          <UAvatar
            :src="avatarUrl"
            :alt="displayName"
            icon="i-lucide-user"
            size="lg"
          />
          <div>
            <strong>{{ displayName }}</strong>
            <span>{{ user.email }}</span>
          </div>
        </div>

        <div class="actions">
          <UButton
            v-if="!user"
            icon="i-simple-icons-google"
            color="primary"
            size="xl"
            block
            :loading="loading"
            label="Entrar com Google UFMS"
            @click="handleGoogleLogin"
          />

          <template v-else>
            <UButton
              icon="i-lucide-play"
              color="primary"
              size="xl"
              block
              label="Entrar na arena"
              @click="handleIniciarProva"
            />
            <UButton
              icon="i-lucide-log-out"
              color="neutral"
              variant="ghost"
              block
              label="Sair da conta"
              @click="handleLogout"
            />
          </template>
        </div>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth'
import type { ConfigProva } from '#shared/types/exam'

const router = useRouter()
const route = useRoute()
const auth = useFirebaseAuthClient()
const user = useFirebaseUser()

const config = ref<ConfigProva | null>(null)
const totalQuestoes = ref(0)
const loading = ref(false)
const errorMessage = ref('')

const displayName = computed(() => {
  return user.value?.displayName || user.value?.email || 'Competidor'
})
const avatarUrl = computed(() => {
  return user.value?.photoURL || undefined
})

if (route.query.error === 'domain') {
  errorMessage.value = 'Apenas emails @ufms.br são permitidos.'
}

onMounted(async () => {
  try {
    config.value = await $fetch<ConfigProva>('/api/config')
    const questoes = await $fetch<any[]>('/api/questoes')
    totalQuestoes.value = questoes.length
  } catch (e) {
    console.error('Failed to load config:', e)
    errorMessage.value = 'Não foi possível carregar a configuração da prova.'
  }
})

async function handleGoogleLogin() {
  loading.value = true
  errorMessage.value = ''
  try {
    const provider = new GoogleAuthProvider()
    provider.setCustomParameters({ hd: 'ufms.br' })
    const credential = await signInWithPopup(auth, provider)
    const email = String(credential.user.email || '').toLowerCase()

    if (!email.endsWith('@ufms.br')) {
      await signOut(auth)
      errorMessage.value = 'Apenas emails @ufms.br são permitidos.'
    }
  } catch (e: any) {
    errorMessage.value = e?.message || 'Não foi possível entrar com Google.'
  } finally {
    loading.value = false
  }
}

async function handleLogout() {
  await signOut(auth)
}

function handleIniciarProva() {
  router.push('/prova')
}
</script>

<style scoped>
.login-page {
  position: relative;
  display: grid;
  place-items: center;
  overflow: hidden;
  padding: 32px;
}

.login-shell {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 440px;
  gap: 48px;
  width: min(1120px, 100%);
  align-items: center;
}

.brand-block h1 {
  margin: 10px 0 18px;
  max-width: 660px;
  font-size: clamp(56px, 8vw, 112px);
  font-weight: 900;
  line-height: 0.9;
}

.brand-copy {
  max-width: 560px;
  color: rgba(244, 247, 251, 0.7);
  font-size: 19px;
  line-height: 1.6;
}

.mission-panel {
  display: flex;
  flex-direction: column;
  gap: 22px;
  border-radius: 8px;
  padding: 24px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.panel-header h2 {
  margin-top: 4px;
  font-size: 23px;
  font-weight: 800;
}

.welcome-copy {
  color: rgba(244, 247, 251, 0.68);
  line-height: 1.6;
}

.mission-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.mission-stats div {
  display: flex;
  min-height: 72px;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.035);
  padding: 12px;
}

.mission-stats svg {
  color: #19d3ff;
}

.mission-stats span {
  font-size: 12px;
  color: rgba(244, 247, 251, 0.72);
}

.user-strip {
  display: flex;
  align-items: center;
  gap: 14px;
  border: 1px solid rgba(25, 211, 255, 0.22);
  border-radius: 8px;
  padding: 12px;
}

.user-strip div {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.user-strip span {
  overflow: hidden;
  color: rgba(244, 247, 251, 0.58);
  font-size: 13px;
  text-overflow: ellipsis;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

@media (max-width: 900px) {
  body {
    overflow: auto;
  }

  .login-page {
    overflow-y: auto;
  }

  .login-shell {
    grid-template-columns: 1fr;
    gap: 28px;
  }

  .brand-block h1 {
    font-size: clamp(48px, 16vw, 82px);
  }
}
</style>
