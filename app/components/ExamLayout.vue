<template>
  <div class="exam-layout">
    <header class="exam-topbar">
      <div class="topbar-left">
        <UIcon name="i-lucide-terminal-square" class="brand-icon" />
        <div>
          <p class="arena-kicker">Competição ativa</p>
          <h1>{{ config?.titulo || "Prova Python" }}</h1>
        </div>
      </div>

      <div class="topbar-right">
        <USelect
          v-model="selectedQuestionId"
          class="mobile-question-select"
          :items="questionItems"
          value-key="value"
          label-key="label"
          color="neutral"
          variant="outline"
          aria-label="Selecionar questão"
        />
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
        <UCard
          v-if="provaFinalizada"
          class="final-state"
          :ui="{ body: 'final-state-body' }"
        >
          <UIcon name="i-lucide-flag-triangle-right" class="final-icon" />
          <h2>Prova finalizada</h2>
          <p>O tempo acabou ou a prova foi encerrada.</p>
          <div class="results-summary">
            <div v-for="q in questoes" :key="q.id" class="summary-item">
              <span>Q{{ q.id }}</span>
              <UIcon
                :name="summaryIcon(statusForQuestion(q.id))"
                :class="`status-${statusForQuestion(q.id)}`"
              />
            </div>
          </div>
        </UCard>

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
import type { StatusQuestao } from "#shared/types/exam";

const exam = useExamStore();
const {
  config,
  questoes,
  questaoAtual,
  questaoAtualIdx,
  statusQuestoes,
  provaFinalizada,
  securityScore,
} = storeToRefs(exam);
const { finalizarProva } = exam;

const scoreColor = computed(() => {
  if (securityScore.value === "critical") return "error";
  if (securityScore.value === "attention") return "warning";
  return "success";
});
const questionItems = computed(() =>
  questoes.value.map((q, index) => ({
    label: `Q${q.id}`,
    value: index,
  })),
);
const selectedQuestionId = computed({
  get: () => questaoAtualIdx.value,
  set: (index: number) => exam.selecionarQuestao(index),
});

function summaryIcon(status: StatusQuestao) {
  if (status === "correta") return "i-lucide-circle-check";
  if (status === "incorreta") return "i-lucide-circle-x";
  if (status === "erro") return "i-lucide-triangle-alert";
  return "i-lucide-circle-minus";
}

function statusForQuestion(questionId: number): StatusQuestao {
  return statusQuestoes.value[questionId] ?? "pendente";
}
</script>

<style scoped>
.exam-layout {
  position: relative;
  z-index: 1;
  display: flex;
  height: 100dvh;
  flex-direction: column;
  color: var(--ui-text);
}

.exam-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  border-bottom: 1px solid
    color-mix(in oklab, var(--ui-primary) 16%, transparent);
  background: color-mix(in oklab, var(--ui-bg) 88%, transparent);
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
  color: var(--ui-primary);
}

.topbar-left h1 {
  margin: 2px 0 0;
  font-size: 18px;
  font-weight: 900;
}

.score-badge {
  text-transform: uppercase;
}

.mobile-question-select {
  display: none;
  width: 112px;
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
  width: min(720px, calc(100% - 48px));
  min-height: 420px;
  margin: 48px auto;
}

.final-state :deep(.final-state-body) {
  display: flex;
  min-height: 420px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 32px;
  text-align: center;
}

.final-state h2 {
  font-size: 32px;
  font-weight: 900;
}

.final-state p {
  color: var(--ui-text-muted);
}

.final-icon {
  width: 58px;
  height: 58px;
  color: var(--ui-warning);
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
  border: 1px solid var(--ui-border-muted);
  border-radius: 8px;
  background: var(--ui-bg-muted);
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

  .mobile-question-select {
    display: block;
  }
}
</style>
