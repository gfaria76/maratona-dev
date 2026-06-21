/**
 * server/utils/python-runner.ts
 *
 * Executes Python code with Pyodide inside a disposable worker thread.
 */
import { createRequire } from 'node:module'
import { dirname } from 'node:path'
import { Worker } from 'node:worker_threads'
import type { CodigoArquivo } from '#shared/types/exam'

const TIMEOUT_MS = 10_000
const require = createRequire(import.meta.url)
const PYODIDE_INDEX_URL = dirname(require.resolve('pyodide'))

export interface ExecResult {
  output: string
  erro?: string
}

export interface TesteResult {
  passou: boolean
  obtido: string
  saida: string
  erro?: boolean
}

interface WorkerPayload {
  codigo: string
  inputs?: string
  arquivos: CodigoArquivo[]
  indexURL: string
}

interface WorkerResult extends ExecResult {
  type: 'result'
}

interface WorkerFailure {
  type: 'error'
  erro: string
}

type WorkerMessage = WorkerResult | WorkerFailure

function isSafePythonFileName(name: string): boolean {
  return (
    name.endsWith('.py') &&
    !name.startsWith('/') &&
    !name.startsWith('\\') &&
    !name.includes('..') &&
    /^[A-Za-z0-9_./-]+$/.test(name)
  )
}

function normalizeExtraFiles(arquivos: CodigoArquivo[] = []): CodigoArquivo[] {
  const seen = new Set<string>()
  return arquivos
    .map((arquivo) => ({
      name: arquivo.name.trim().replace(/\\/g, '/').replace(/^\/+/, ''),
      content: arquivo.content ?? '',
    }))
    .filter((arquivo) => {
      if (!arquivo.name || arquivo.name === 'main.py' || seen.has(arquivo.name)) return false
      if (!isSafePythonFileName(arquivo.name)) return false
      seen.add(arquivo.name)
      return true
    })
}

/**
 * Executa código Python genérico (para o botão "Executar/Testar").
 */
export async function executarPython(codigo: string, inputs?: string, arquivos: CodigoArquivo[] = []): Promise<ExecResult> {
  return await runPythonInWorker({
    codigo,
    inputs,
    arquivos: normalizeExtraFiles(arquivos),
    indexURL: PYODIDE_INDEX_URL,
  })
}

export function montarCodigoValidacao(codigo: string, codigoTeste?: string): string {
  const teste = String(codigoTeste || '').trim()
  if (!teste) return codigo

  return `${codigo.trimEnd()}\n\n${teste}`
}

/**
 * Valida se o código do aluno respeita os impedimentos.
 */
export function validarImpedimentos(codigo: string, impedimentos: string[]): string[] {
  const violacoes: string[] = []

  for (const imp of impedimentos) {
    const impLower = imp.toLowerCase()

    if (impLower.includes('import') && /\bimport\b/.test(codigo)) {
      violacoes.push(imp)
    }

    const funcoesBloqueadas = ['max', 'min', 'sum', 'len', 'sorted', 'sort']
    for (const fn of funcoesBloqueadas) {
      if (impLower.includes(`${fn}()`) || impLower.includes(fn)) {
        const regex = new RegExp(`\\b${fn}\\s*\\(`, 'g')
        if (regex.test(codigo) && !violacoes.includes(imp)) {
          violacoes.push(imp)
        }
      }
    }
  }

  return violacoes
}

/**
 * Executa os testes de uma questão contra o código do aluno.
 *
 * Gera um script Python que:
 * 1. Define a função do aluno
 * 2. Redireciona stdout para capturar prints
 * 3. Chama a função com cada entrada de teste
 * 4. Compara o resultado e gera JSON com os resultados
 */
export async function executarTestes(
  codigo: string,
  funcaoNome: string,
  testes: Array<{ entrada: any; esperado: any }>,
  arquivos: CodigoArquivo[] = []
): Promise<TesteResult[]> {
  const testesJson = JSON.stringify(testes)

  const script = `
import json
import sys
import io

# --- Código do aluno ---
${codigo}

# --- Execução dos testes ---
_testes = json.loads('''${testesJson.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}''')
_resultados = []

for _t in _testes:
    _entrada = _t["entrada"]
    _esperado = _t["esperado"]

    # Capture stdout (prints do aluno)
    _old_stdout = sys.stdout
    sys.stdout = _buf = io.StringIO()

    try:
        _resultado = ${funcaoNome}(_entrada)
        _saida = _buf.getvalue()
        sys.stdout = _old_stdout

        _resultados.append({
            "passou": _resultado == _esperado,
            "obtido": repr(_resultado),
            "saida": _saida
        })
    except Exception as _e:
        sys.stdout = _old_stdout
        _resultados.append({
            "passou": False,
            "obtido": str(_e),
            "saida": _buf.getvalue(),
            "erro": True
        })

# Output results as JSON to the original stdout
print(json.dumps(_resultados))
`

  const { output, erro } = await executarPython(script, undefined, arquivos)

  if (erro && !output) {
    return [{
      passou: false,
      obtido: erro,
      saida: '',
      erro: true,
    }]
  }

  try {
    const lines = output.trim().split('\n')
    const jsonLine = lines[lines.length - 1]
    if (!jsonLine) {
      throw new Error('Empty test runner output')
    }
    return JSON.parse(jsonLine)
  } catch {
    return [{
      passou: false,
      obtido: `Erro ao processar resultados: ${output || erro}`,
      saida: '',
      erro: true,
    }]
  }
}

function runPythonInWorker(payload: WorkerPayload): Promise<ExecResult> {
  return new Promise((resolve) => {
    const worker = new Worker(PYODIDE_WORKER_SOURCE, {
      eval: true,
      workerData: payload,
    })
    let settled = false

    const finish = async (result: ExecResult) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      worker.removeAllListeners()
      await worker.terminate().catch(() => undefined)
      resolve(result)
    }

    const timeout = setTimeout(() => {
      finish({
        output: '',
        erro: 'Tempo limite excedido (10s). Verifique se há loops infinitos.',
      }).catch(() => undefined)
    }, TIMEOUT_MS)

    worker.once('message', (message: WorkerMessage) => {
      if (message.type === 'result') {
        finish({ output: message.output, erro: message.erro }).catch(() => undefined)
        return
      }

      finish({ output: '', erro: message.erro }).catch(() => undefined)
    })

    worker.once('error', (error) => {
      finish({ output: '', erro: error instanceof Error ? error.message : String(error) }).catch(() => undefined)
    })

    worker.once('exit', (code) => {
      if (!settled && code !== 0) {
        finish({ output: '', erro: `Worker finalizado com código ${code}.` }).catch(() => undefined)
      }
    })
  })
}

const PYODIDE_WORKER_SOURCE = String.raw`
const { parentPort, workerData } = require('node:worker_threads');

function dirname(fileName) {
  const index = fileName.lastIndexOf('/');
  return index === -1 ? '' : fileName.slice(0, index);
}

function splitInput(input) {
  if (!input) return [];
  return String(input).replace(/\r\n/g, '\n').split('\n');
}

(async () => {
  try {
    const { loadPyodide } = await import('pyodide');
    const pyodide = await loadPyodide({ indexURL: workerData.indexURL });
    const stdout = [];
    const stderr = [];
    const inputLines = splitInput(workerData.inputs);

    pyodide.setStdout({
      raw: (charCode) => {
        stdout.push(String.fromCharCode(charCode));
      },
    });
    pyodide.setStderr({
      raw: (charCode) => {
        stderr.push(String.fromCharCode(charCode));
      },
    });
    pyodide.setStdin({
      stdin: () => inputLines.length ? inputLines.shift() : null,
    });

    pyodide.runPython('import os\nos.chdir("/home/pyodide")');

    for (const arquivo of workerData.arquivos || []) {
      const name = String(arquivo.name || '').replace(/\\/g, '/').replace(/^\/+/, '');
      const parent = dirname(name);
      if (parent) {
        pyodide.FS.mkdirTree('/home/pyodide/' + parent);
      }
      pyodide.FS.writeFile('/home/pyodide/' + name, String(arquivo.content || ''));
    }

    try {
      await pyodide.runPythonAsync(String(workerData.codigo || ''), { filename: 'main.py' });
      parentPort.postMessage({
        type: 'result',
        output: stdout.join(''),
        erro: stderr.join('') || undefined,
      });
    } catch (error) {
      parentPort.postMessage({
        type: 'result',
        output: stdout.join(''),
        erro: stderr.join('') || String(error && (error.stack || error.message) || error),
      });
    }
  } catch (error) {
    parentPort.postMessage({
      type: 'error',
      erro: String(error && (error.stack || error.message) || error),
    });
  }
})();
`
