<template>
  <UCard class="io-panel" :ui="{ body: 'flex flex-col gap-4' }">
    <section class="io-section">
      <div class="panel-title">
        <UIcon name="i-lucide-square-terminal" />
        <span>Validação local</span>
      </div>

      <UFormField label="Código de teste" name="codigo_teste">
        <UTextarea
          v-model="codigoTesteLocal"
          class="font-mono"
          :rows="5"
          autoresize
          :maxrows="8"
          placeholder="Sem código de teste para esta questão."
          variant="outline"
        />
      </UFormField>

      <UFormField label="Entrada stdin" name="stdin">
        <UTextarea
          v-model="stdinLocal"
          class="font-mono"
          :rows="4"
          autoresize
          :maxrows="6"
          placeholder="Sem entrada stdin para esta questão."
          variant="outline"
        />
      </UFormField>

      <UButton
        icon="i-lucide-play"
        color="primary"
        variant="solid"
        :loading="executando"
        :disabled="executando || carregando || provaFinalizada"
        label="Validar"
        @click="handleValidar"
      />

      <div class="io-label">
        <UIcon name="i-lucide-scroll-text" />
        <span>Saída stdout obtida</span>
      </div>
      <div class="io-output" :class="{ 'has-error': !!erroExecucao }">
        <template v-if="outputExecucao || erroExecucao">
          <pre v-if="outputExecucao" class="output-text">{{
            outputExecucao
          }}</pre>
          <pre v-if="erroExecucao" class="error-text">{{ erroExecucao }}</pre>
        </template>
        <span v-else class="placeholder-text"
          >A saída da validação aparecerá aqui.</span
        >
      </div>
    </section>

    <USeparator />

    <section class="io-section">
      <div class="panel-title">
        <UIcon name="i-lucide-send" />
        <span>Submissão oficial</span>
      </div>

      <UButton
        icon="i-lucide-upload"
        color="warning"
        variant="soft"
        :loading="carregando"
        :disabled="executando || carregando || provaFinalizada"
        label="Submeter"
        @click="handleSubmeter"
      />

      <UCard
        v-if="resultado"
        class="submission-result"
        :class="resultado.passou ? 'is-success' : 'is-fail'"
        :ui="{ body: 'flex flex-col gap-3 p-3 sm:p-3' }"
      >
        <div class="result-line">
          <UIcon
            :name="
              resultado.passou
                ? 'i-lucide-circle-check'
                : 'i-lucide-circle-alert'
            "
          />
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
      </UCard>

      <p v-else class="placeholder-text">
        A submissão oficial ainda não foi enviada.
      </p>
    </section>
  </UCard>
</template>

<script setup lang="ts">
import type { CodigoArquivo, ResultadoCorrecao } from "#shared/types/exam";
import { getCorrectionSummary } from "~/utils/result-summary";

const props = defineProps<{
  questaoId: number;
  codigo: string;
  codigoTeste: string;
  stdin: string;
  arquivos: CodigoArquivo[];
  resultado: ResultadoCorrecao | null;
}>();

const exam = useExamStore();
const { carregando, executando, provaFinalizada, validacoes } =
  storeToRefs(exam);
const { atualizarValidacaoLocal, executar, submeter } = exam;

const validacaoAtual = computed(
  () =>
    validacoes.value[props.questaoId] ?? {
      codigoTeste: props.codigoTeste,
      stdin: props.stdin,
      output: "",
      erro: undefined,
    },
);
const codigoTesteLocal = computed({
  get: () => validacaoAtual.value.codigoTeste,
  set: (value: string) =>
    atualizarValidacaoLocal(props.questaoId, { codigoTeste: value }),
});
const stdinLocal = computed({
  get: () => validacaoAtual.value.stdin,
  set: (value: string) =>
    atualizarValidacaoLocal(props.questaoId, { stdin: value }),
});
const outputExecucao = computed(() => validacaoAtual.value.output);
const erroExecucao = computed(() => validacaoAtual.value.erro);
const summary = computed(() =>
  props.resultado
    ? getCorrectionSummary(props.resultado)
    : {
        title: "0% correto",
        percent: 0,
        hasExecutionError: false,
        executionError: undefined,
      },
);

async function handleValidar() {
  await executar(
    props.questaoId,
    props.codigo,
    stdinLocal.value || undefined,
    props.arquivos,
    codigoTesteLocal.value || undefined,
  );
}

async function handleSubmeter() {
  await submeter(props.questaoId);
}
</script>

<style scoped>
.io-panel {
  min-height: 100%;
}

.io-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.panel-title,
.io-label {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--ui-primary);
  font-family: "Roboto Mono", monospace;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.io-label {
  color: var(--ui-text-muted);
  font-size: 11px;
}

.io-output {
  border: 1px solid color-mix(in oklab, var(--ui-border-muted) 86%, transparent);
  border-radius: 8px;
  background: color-mix(in oklab, var(--ui-bg) 92%, black);
  max-height: 180px;
  min-height: 120px;
  overflow-y: auto;
  padding: 12px;
  font-family: "Roboto Mono", monospace;
  font-size: 13px;
}

.io-output.has-error {
  border-color: color-mix(in oklab, var(--ui-error) 48%, transparent);
}

.output-text,
.error-text {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}

.output-text {
  color: var(--color-arena-green);
}

.error-text {
  color: var(--color-arena-rose);
}

.placeholder-text {
  color: var(--ui-text-dimmed);
  font-style: italic;
}

.submission-result.is-success {
  border-color: color-mix(in oklab, var(--ui-success) 26%, transparent);
}

.submission-result.is-fail {
  border-color: color-mix(in oklab, var(--ui-error) 26%, transparent);
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
  color: var(--color-arena-green);
}

.submission-result.is-fail .result-line {
  color: var(--color-arena-amber);
}
</style>
