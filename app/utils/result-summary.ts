import type { ResultadoCorrecao } from '#shared/types/exam'

export interface CorrectionSummary {
  title: string
  percent: number
  hasExecutionError: boolean
  executionError?: string
}

export function getCorrectionSummary(resultado: ResultadoCorrecao): CorrectionSummary {
  const percent = Math.round((resultado.acertos / Math.max(resultado.total, 1)) * 100)
  const executionError = resultado.erro || resultado.detalhes.find((detail) => detail.erro)?.obtido

  return {
    title: `${percent}% correto`,
    percent,
    hasExecutionError: Boolean(executionError),
    executionError,
  }
}
