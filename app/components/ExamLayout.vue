<template>
  <div class="exam-layout">
    <header class="exam-topbar">
      <div class="topbar-left">
        <UIcon name="i-lucide-terminal-square" class="brand-icon" />
        <div>
          <p class="arena-kicker">Competição ativa</p>
          <h1>{{ config?.titulo || 'Prova Python' }}</h1>
        </div>
      </div>

      <div class="topbar-right">
        <UBadge :color="scoreColor" variant="soft" class="score-badge">
          Segurança: {{ securityScore }}
        </UBadge>
        <ExamTimer />
        <UButton
          icon="i-lucide-flag"
          color="warning"
          variant="soft"
          label="Finalizar"
          @click="finalizarProva"
        />
      </div>
    </header>

    <div class="exam-body">
      <QuestionSidebar />

      <main class="exam-main">
        <section v-if="provaFinalizada" class="final-state arena-card">
          <UIcon name="i-lucide-flag-triangle-right" class="final-icon" />
          <h2>Prova finalizada</h2>
          <p>O tempo acabou ou a prova foi encerrada.</p>
          <div class="results-summary">
            <div v-for="q in questoes" :key="q.id" class="summary-item">
              <span>Q{{ q.id }}</span>
              <UIcon :name="summaryIcon(statusForQuestion(q.id))" :class="`status-${statusForQuestion(q.id)}`" />
            </div>
          </div>
        </section>

        <QuestionPanel v-else-if="questaoAtual" :questao="questaoAtual" />

        <section v-else class="loading-state">
          <USkeleton class="h-10 w-64" />
          <USkeleton class="h-96 w-full max-w-4xl" />
        </section>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { StatusQuestao } from '#shared/types/exam'

const exam = useExamStore()
const {
  config,
  questoes,
  questaoAtual,
  statusQuestoes,
  provaFinalizada,
  securityScore,
} = storeToRefs(exam)
const { finalizarProva } = exam

const scoreColor = computed(() => {
  if (securityScore.value === 'critical') return 'error'
  if (securityScore.value === 'attention') return 'warning'
  return 'success'
})

function summaryIcon(status: StatusQuestao) {
  if (status === 'correta') return 'i-lucide-circle-check'
  if (status === 'incorreta') return 'i-lucide-circle-x'
  if (status === 'erro') return 'i-lucide-triangle-alert'
  return 'i-lucide-circle-minus'
}

function statusForQuestion(questionId: number): StatusQuestao {
  return statusQuestoes.value[questionId] ?? 'pendente'
}
</script>

<style scoped>
.exam-layout {
  position: relative;
  z-index: 1;
  display: flex;
  height: 100dvh;
  flex-direction: column;
  color: #f4f7fb;
}

.exam-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  border-bottom: 1px solid rgba(25, 211, 255, 0.16);
  background: rgba(7, 8, 13, 0.86);
  padding: 12px 18px;
  backdrop-filter: blur(18px);
}

.topbar-left,
.topbar-right {
  display: flex;
  align-items: center;
  gap: 14px;
}

.brand-icon {
  width: 34px;
  height: 34px;
  color: #19d3ff;
}

.topbar-left h1 {
  margin: 2px 0 0;
  font-size: 18px;
  font-weight: 900;
}

.score-badge {
  text-transform: uppercase;
}

.exam-body {
  display: grid;
  grid-template-columns: 62px minmax(0, 1fr);
  min-height: 0;
  flex: 1;
}

.exam-main {
  min-width: 0;
  overflow-y: auto;
}

.final-state {
  display: flex;
  width: min(720px, calc(100% - 48px));
  min-height: 420px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin: 48px auto;
  padding: 32px;
  text-align: center;
}

.final-state h2 {
  font-size: 32px;
  font-weight: 900;
}

.final-state p {
  color: rgba(244, 247, 251, 0.64);
}

.final-icon {
  width: 58px;
  height: 58px;
  color: #ffb020;
}

.results-summary {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  margin-top: 12px;
}

.summary-item {
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  padding: 8px 12px;
  font-family: "Roboto Mono", monospace;
  font-size: 12px;
}

.loading-state {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 32px;
}

@media (max-width: 980px) {
  .exam-body {
    grid-template-columns: 1fr;
  }

  .topbar-right {
    flex-wrap: wrap;
    justify-content: flex-end;
  }
}
</style>
