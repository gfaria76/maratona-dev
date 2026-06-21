<template>
  <aside class="question-sidebar">
    <div class="question-list">
      <UTooltip
        v-for="(q, idx) in questoes"
        :key="q.id"
        :text="`Q${q.id}: ${q.titulo}`"
        :content="{ side: 'right' }"
      >
        <UButton
          class="question-item"
          :class="{ 'is-active': idx === questaoAtualIdx }"
          :label="String(q.id)"
          :color="questionColor(q.id, idx)"
          :variant="idx === questaoAtualIdx ? 'solid' : 'soft'"
          :aria-label="`Questão ${q.id}: ${q.titulo}`"
          @click="selecionarQuestao(idx)"
        />
      </UTooltip>
    </div>
  </aside>
</template>

<script setup lang="ts">
import type { StatusQuestao } from "#shared/types/exam";

const exam = useExamStore();
const { questoes, questaoAtualIdx, statusQuestoes } = storeToRefs(exam);
const { selecionarQuestao } = exam;

function questionColor(questionId: number, index: number) {
  const status = statusQuestoes.value[questionId] as StatusQuestao | undefined;
  if (index === questaoAtualIdx.value) return "primary";
  if (status === "correta") return "success";
  if (status === "incorreta") return "error";
  if (status === "erro") return "warning";
  return "neutral";
}
</script>

<style scoped>
.question-sidebar {
  display: flex;
  min-height: 0;
  flex-direction: column;
  border-right: 1px solid
    color-mix(in oklab, var(--ui-primary) 16%, transparent);
  background: color-mix(in oklab, var(--ui-bg) 86%, transparent);
  backdrop-filter: blur(16px);
}

.question-list {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  overflow-y: auto;
  padding: 12px 8px;
}

.question-item {
  width: 44px;
  height: 44px;
  font-family: "Roboto Mono", monospace;
  font-size: 14px;
  font-weight: 900;
  line-height: 1;
  transition: transform 0.18s ease;
}

.question-item:hover {
  transform: translateY(-1px);
}

.question-item.is-active {
  box-shadow: 0 0 18px color-mix(in oklab, var(--ui-primary) 18%, transparent);
}

@media (max-width: 980px) {
  .question-sidebar {
    display: none;
  }
}
</style>
