<template>
  <aside class="question-sidebar">
    <div class="question-list">
      <button
v-for="(q, idx) in questoes" :key="q.id" class="question-item" :class="{
        'is-active': idx === questaoAtualIdx,
        'is-correct': statusQuestoes[q.id] === 'correta',
        'is-incorrect': statusQuestoes[q.id] === 'incorreta',
        'is-error': statusQuestoes[q.id] === 'erro',
      }" :aria-label="`Questão ${q.id}: ${q.titulo}`" :title="q.titulo" @click="selecionarQuestao(idx)">
        {{ q.id }}
      </button>
    </div>
  </aside>
</template>

<script setup lang="ts">
const exam = useExamStore()
const { questoes, questaoAtualIdx, statusQuestoes } = storeToRefs(exam)
const { selecionarQuestao } = exam
</script>

<style scoped>
.question-sidebar {
  display: flex;
  min-height: 0;
  flex-direction: column;
  border-right: 1px solid rgba(25, 211, 255, 0.16);
  background: rgba(7, 10, 18, 0.86);
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
  display: grid;
  width: 44px;
  height: 44px;
  align-items: center;
  justify-items: center;
  border: 1px solid transparent;
  border-radius: 8px;
  color: rgba(244, 247, 251, 0.74);
  cursor: pointer;
  font-family: "Roboto Mono", monospace;
  font-size: 14px;
  font-weight: 900;
  line-height: 1;
  transition: border-color 0.18s ease, background 0.18s ease, color 0.18s ease, transform 0.18s ease;
}

.question-item:hover,
.question-item.is-active {
  border-color: rgba(25, 211, 255, 0.28);
  background: rgba(25, 211, 255, 0.12);
  color: #f4f7fb;
}

.question-item:hover {
  transform: translateY(-1px);
}

.question-item.is-active {
  box-shadow: inset 0 0 0 1px rgba(25, 211, 255, 0.24), 0 0 18px rgba(25, 211, 255, 0.12);
}

.question-item.is-correct {
  border-color: rgba(51, 226, 143, 0.62);
  color: rgba(51, 226, 143, 0.88);
  background: rgba(51, 226, 143, 0.45);
}

.question-item.is-incorrect {
  border-color: rgba(255, 77, 143, 0.62);
  color: rgba(255, 77, 143, 0.82);
  background: rgba(255, 77, 143, 0.35);
}

.question-item.is-error {
  border-color: rgba(255, 176, 32, 0.68);
  color: rgba(255, 176, 32, 0.88);
  background: rgba(255, 177, 32, 0.35);
}

@media (max-width: 980px) {
  .question-sidebar {
    display: none;
  }
}
</style>
