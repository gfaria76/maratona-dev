<template>
  <section class="question-panel">
    <div class="workspace-grid">
      <div class="left-stage">
        <section class="brief-card arena-card">
          <div class="statement">
            <div class="question-heading">
              <UBadge color="primary" variant="soft">Q{{ questao.id }}</UBadge>
              <h2>{{ questao.titulo }}</h2>
            </div>
            <p>{{ questao.texto }}</p>
          </div>

          <div class="support-grid">
            <div v-if="questao.impedimentos.length" class="rule-strip">
              <div class="strip-title">
                <UIcon name="i-lucide-ban" />
                <strong>Impedimentos</strong>
              </div>
              <div class="badge-row">
                <UBadge v-for="imp in questao.impedimentos" :key="imp" color="error" variant="outline">
                  {{ imp }}
                </UBadge>
              </div>
            </div>

            <div class="example-strip">
              <div class="strip-title">
                <UIcon name="i-lucide-lightbulb" />
                <strong>Exemplo</strong>
              </div>
              <div class="example-code">
                <code>>>> {{ questao.exemplo.chamada }}</code>
                <code class="example-result">{{ formatValue(questao.exemplo.retorno_esperado) }}</code>
              </div>
            </div>
          </div>
        </section>

        <div class="editor-zone">
          <div class="section-title">
            <UIcon name="i-lucide-code-2" />
            <span>Código do competidor</span>
          </div>
          <FileTabsEditor
            class="student-editor"
            :model-value="codigo"
            :files="arquivosQuestao"
            @update:model-value="(val: string) => atualizarCodigo(questao.id, val)"
            @update:files="(val) => atualizarArquivos(questao.id, val)"
            @large-paste="handleLargePaste"
          />
        </div>
      </div>

      <aside class="side-zone">
        <IoPanel :questao-id="questao.id" :codigo="codigo" :arquivos="arquivosQuestao" :resultado="resultado" />
      </aside>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { QuestaoPublica } from '#shared/types/exam'

const props = defineProps<{
  questao: QuestaoPublica
}>()

const exam = useExamStore()
const { arquivos, codigos, resultados } = storeToRefs(exam)
const { atualizarArquivos, atualizarCodigo, reportarEventoSeguranca } = exam

const codigo = computed(() => codigos.value[props.questao.id] || props.questao.funcao_assinatura)
const arquivosQuestao = computed(() => arquivos.value[props.questao.id] ?? [{ name: 'main.py', content: codigo.value }])
const resultado = computed(() => resultados.value[props.questao.id] ?? null)

function handleLargePaste(payload: { length: number }) {
  reportarEventoSeguranca('large_paste', {
    questaoId: props.questao.id,
    pastedLength: payload.length,
  })
}

function formatValue(val: any): string {
  if (val === undefined || val === null) return '-'
  if (typeof val === 'string') return val
  return JSON.stringify(val)
}
</script>

<style scoped>
.question-panel {
  display: flex;
  flex-direction: column;
  min-height: calc(100dvh - 72px);
  padding: 14px;
}

.workspace-grid {
  display: grid;
  min-height: 0;
  flex: 1;
  grid-template-columns: minmax(0, 1fr) 392px;
  gap: 14px;
  align-items: stretch;
}

.left-stage {
  display: flex;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
  gap: 12px;
}

.brief-card {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(320px, 0.95fr);
  gap: 14px;
  align-items: stretch;
  border-radius: 8px;
  padding: 14px;
}

.statement {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 10px;
  justify-content: center;
}

.question-heading {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.question-heading h2 {
  margin: 0;
  font-size: clamp(18px, 1.4vw, 24px);
  font-weight: 900;
  line-height: 1.12;
}

.statement p {
  margin: 0;
  color: rgba(244, 247, 251, 0.72);
  font-size: 14px;
  line-height: 1.48;
}

.support-grid {
  display: grid;
  min-width: 0;
  gap: 10px;
}

.rule-strip,
.example-strip {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 9px;
  border-radius: 8px;
  padding: 11px;
}

.rule-strip {
  border: 1px solid rgba(255, 77, 143, 0.24);
  background: rgba(255, 77, 143, 0.08);
}

.example-strip {
  border: 1px solid rgba(255, 176, 32, 0.24);
  background: rgba(255, 176, 32, 0.07);
}

.strip-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: "Roboto Mono", monospace;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.rule-strip .strip-title {
  color: #ff4d8f;
}

.example-strip .strip-title {
  color: #ffb020;
}

.badge-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.example-code {
  display: grid;
  min-width: 0;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
}

.example-strip code {
  overflow: hidden;
  font-family: "Roboto Mono", monospace;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.example-result {
  color: #33e28f;
}

.editor-zone,
.side-zone {
  display: flex;
  min-height: 0;
  flex-direction: column;
  gap: 12px;
}

.side-zone :deep(.io-panel) {
  height: 100%;
}

.editor-zone {
  flex: 1;
}

.student-editor {
  flex: 1;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  color: rgba(25, 211, 255, 0.82);
  font-family: "Roboto Mono", monospace;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

@media (max-width: 1180px) {
  .workspace-grid {
    grid-template-columns: 1fr;
  }

  .brief-card {
    grid-template-columns: 1fr;
  }

  .side-zone :deep(.io-panel) {
    height: auto;
  }
}
</style>
