<template>
  <div class="io-panel arena-card">
    <section class="io-section">
      <div class="panel-title">
        <UIcon name="i-lucide-square-terminal" />
        <span>Validação local</span>
      </div>

      <label class="io-label">Código de teste</label>
      <textarea
        v-model="codigoTeste"
        class="terminal-panel io-input code-test-input"
        placeholder="Ex.: print(somar_lista([1, 2, 3]))"
        rows="5"
      />

      <label class="io-label">Entrada stdin</label>
      <textarea
        v-model="inputText"
        class="terminal-panel io-input"
        placeholder="Valores de input, um por linha..."
        rows="4"
      />

      <UButton
        icon="i-lucide-play"
        color="primary"
        variant="outline"
        :loading="executando"
        :disabled="executando || carregando || provaFinalizada"
        label="Validar"
        @click="handleValidar"
      />

      <label class="io-label">Saída stdout</label>
      <div class="terminal-panel io-output" :class="{ 'has-error': !!erroExecucao }">
        <template v-if="outputExecucao || erroExecucao">
          <pre v-if="outputExecucao" class="output-text">{{ outputExecucao }}</pre>
          <pre v-if="erroExecucao" class="error-text">{{ erroExecucao }}</pre>
        </template>
        <span v-else class="placeholder-text">A saída da validação aparecerá aqui.</span>
      </div>
    </section>

    <section class="io-section submission-section">
      <div class="panel-title">
        <UIcon name="i-lucide-send" />
        <span>Submissão oficial</span>
      </div>

      <UButton
        icon="i-lucide-upload"
        color="warning"
        variant="outline"
        :loading="carregando"
        :disabled="executando || carregando || provaFinalizada"
        label="Submeter"
        @click="handleSubmeter"
      />

      <div v-if="resultado" class="submission-result" :class="resultado.passou ? 'is-success' : 'is-fail'">
        <div class="result-line">
          <UIcon :name="resultado.passou ? 'i-lucide-circle-check' : 'i-lucide-circle-alert'" />
          <strong>{{ summary.title }}</strong>
        </div>

        <UProgress
          :model-value="summary.percent"
          :color="resultado.passou ? 'success' : 'error'"
          size="sm"
        />

        <UAlert
          v-if="summary.hasExecutionError"
          color="warning"
          variant="soft"
          icon="i-lucide-triangle-alert"
          title="Primeiro erro"
          :description="summary.executionError"
        />
      </div>

      <p v-else class="placeholder-text">A submissão oficial ainda não foi enviada.</p>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { CodigoArquivo, ResultadoCorrecao } from '#shared/types/exam'
import { getCorrectionSummary } from '~/utils/result-summary'

const props = defineProps<{
  questaoId: number
  codigo: string
  arquivos: CodigoArquivo[]
  resultado: ResultadoCorrecao | null
}>()

const exam = useExamStore()
const { carregando, executando, outputExecucao, erroExecucao, provaFinalizada } = storeToRefs(exam)
const { executar, submeter } = exam

const inputText = ref('')
const codigoTeste = ref('')
const summary = computed(() => props.resultado
  ? getCorrectionSummary(props.resultado)
  : { title: '0% correto', percent: 0, hasExecutionError: false, executionError: undefined }
)

async function handleValidar() {
  await executar(props.codigo, inputText.value || undefined, props.arquivos, codigoTeste.value || undefined)
}

async function handleSubmeter() {
  await submeter(props.questaoId)
}
</script>

<style scoped>
.io-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
  border-radius: 8px;
  padding: 14px;
}

.io-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.submission-section {
  border-top: 1px solid rgba(25, 211, 255, 0.14);
  padding-top: 14px;
}

.panel-title,
.io-label {
  display: flex;
  align-items: center;
  gap: 8px;
  color: rgba(25, 211, 255, 0.82);
  font-family: "Roboto Mono", monospace;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.io-label {
  color: rgba(244, 247, 251, 0.54);
  font-size: 11px;
}

.io-input {
  min-height: 94px;
}

.code-test-input {
  min-height: 124px;
}

.io-output {
  max-height: 180px;
  min-height: 120px;
  overflow-y: auto;
}

.io-output.has-error {
  border-color: rgba(255, 77, 143, 0.5);
}

.output-text,
.error-text {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}

.output-text {
  color: #33e28f;
}

.error-text {
  color: #ff4d8f;
}

.placeholder-text {
  color: rgba(244, 247, 251, 0.32);
  font-style: italic;
}

.submission-result {
  display: flex;
  flex-direction: column;
  gap: 10px;
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 8px;
  background: rgba(5, 8, 15, 0.38);
  padding: 12px;
}

.submission-result.is-success {
  border-color: rgba(51, 226, 143, 0.24);
}

.submission-result.is-fail {
  border-color: rgba(255, 77, 143, 0.24);
}

.result-line {
  display: flex;
  align-items: center;
  gap: 8px;
}

.result-line strong {
  font-size: 16px;
}

.submission-result.is-success .result-line {
  color: #33e28f;
}

.submission-result.is-fail .result-line {
  color: #ffb020;
}
</style>
