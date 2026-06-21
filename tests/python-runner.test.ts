import { describe, expect, it } from 'vitest'
import { readFile } from 'node:fs/promises'
import { executarPython, montarCodigoValidacao, validarImpedimentos } from '../server/utils/python-runner'

describe('python-runner', () => {
  it('does not depend on a system python executable', async () => {
    const source = await readFile(new URL('../server/utils/python-runner.ts', import.meta.url), 'utf-8')
    expect(source).not.toContain('node:child_process')
    expect(source).not.toContain('execFile')
    expect(source).not.toContain('python3')
  })

  it('appends validation code only for local validation', () => {
    expect(montarCodigoValidacao('x = 1', 'print(x)')).toBe('x = 1\n\nprint(x)')
    expect(montarCodigoValidacao('x = 1', '')).toBe('x = 1')
  })

  it('detects blocked impediments', () => {
    expect(validarImpedimentos('print(sum([1, 2]))', ['não usar sum()'])).toEqual(['não usar sum()'])
  })

  it('executes Python with stdin', async () => {
    const result = await executarPython('nome = input()\nprint("Oi", nome)', 'Ana\n')
    expect(result.erro).toBeUndefined()
    expect(result.output.trim()).toBe('Oi Ana')
  })

  it('captures stdout from executed Python', async () => {
    const result = await executarPython('print("linha 1")\nprint("linha 2")')
    expect(result.erro).toBeUndefined()
    expect(result.output.trim()).toBe('linha 1\nlinha 2')
  })

  it('returns runtime errors without throwing from JavaScript', async () => {
    const result = await executarPython('print("antes")\nraise ValueError("falhou")')
    expect(result.output.trim()).toBe('antes')
    expect(result.erro).toContain('ValueError')
    expect(result.erro).toContain('falhou')
  })

  it('can import a helper Python file', async () => {
    const result = await executarPython(
      'from helper import dobro\nprint(dobro(21))',
      undefined,
      [{ name: 'helper.py', content: 'def dobro(valor):\n    return valor * 2\n' }]
    )
    expect(result.erro).toBeUndefined()
    expect(result.output.trim()).toBe('42')
  })

  it('times out infinite loops without hanging the process', async () => {
    const result = await executarPython('while True:\n    pass')
    expect(result.output).toBe('')
    expect(result.erro).toBe('Tempo limite excedido (10s). Verifique se há loops infinitos.')
  }, 15_000)
})
