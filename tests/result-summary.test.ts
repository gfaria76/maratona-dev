import { describe, expect, it } from 'vitest'
import { getCorrectionSummary } from '../app/utils/result-summary'

describe('getCorrectionSummary', () => {
  it('shows only the percent when there is no execution error', () => {
    expect(getCorrectionSummary({
      questaoId: 1,
      acertos: 3,
      total: 4,
      passou: false,
      impedimentosViolados: [],
      detalhes: [],
    })).toMatchObject({
      title: '75% correto',
      percent: 75,
      hasExecutionError: false,
    })
  })

  it('returns the first execution error', () => {
    expect(getCorrectionSummary({
      questaoId: 1,
      acertos: 0,
      total: 1,
      passou: false,
      impedimentosViolados: [],
      detalhes: [{ indice: 1, passou: false, erro: true, obtido: 'NameError' }],
    })).toMatchObject({
      title: '0% correto',
      hasExecutionError: true,
      executionError: 'NameError',
    })
  })
})
