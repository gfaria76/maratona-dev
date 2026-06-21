<template>
  <div v-if="resultado" class="result-panel arena-card">
    <div class="result-header" :class="resultado.passou ? 'is-success' : 'is-fail'">
      <UIcon :name="resultado.passou ? 'i-lucide-circle-check' : 'i-lucide-circle-x'" />
      <div>
        <strong>{{ summary.title }}</strong>
        <span>{{ resultado.passou ? 'Todos os critérios passaram' : 'Ainda há comportamento incorreto' }}</span>
      </div>
    </div>

    <UProgress
      :model-value="summary.percent"
      :color="resultado.passou ? 'success' : 'error'"
      size="sm"
    />

    <div v-if="resultado.impedimentosViolados.length" class="violations">
      <UIcon name="i-lucide-ban" />
      <strong>Impedimentos violados</strong>
      <UBadge
        v-for="imp in resultado.impedimentosViolados"
        :key="imp"
        color="error"
        variant="outline"
      >
        {{ imp }}
      </UBadge>
    </div>

    <UAlert
      v-if="summary.hasExecutionError"
      color="warning"
      variant="soft"
      icon="i-lucide-triangle-alert"
      title="Erro de execução"
      :description="summary.executionError"
    />
  </div>
</template>

<script setup lang="ts">
import type { ResultadoCorrecao } from '#shared/types/exam'
import { getCorrectionSummary } from '~/utils/result-summary'

const props = defineProps<{
  resultado: ResultadoCorrecao | null
}>()

const summary = computed(() => props.resultado
  ? getCorrectionSummary(props.resultado)
  : { title: '0% correto', percent: 0, hasExecutionError: false }
)
</script>

<style scoped>
.result-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  border-radius: 8px;
  padding: 14px;
}

.result-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.result-header svg {
  width: 28px;
  height: 28px;
}

.result-header div {
  display: flex;
  flex-direction: column;
}

.result-header strong {
  font-size: 15px;
}

.result-header span {
  color: rgba(244, 247, 251, 0.58);
  font-family: "Roboto Mono", monospace;
  font-size: 12px;
}

.result-header.is-success {
  color: #33e28f;
}

.result-header.is-fail {
  color: #ff4d8f;
}

.violations {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  color: #ff4d8f;
}

</style>
