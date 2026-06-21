import type { CodigoArquivo } from "#shared/types/exam";

const TIMEOUT_MS = 10_000;
const TIMEOUT_MESSAGE =
  "Tempo limite excedido (10s). Verifique se há loops infinitos.";

export interface LocalPythonResult {
  output: string;
  erro?: string;
}

export interface LocalPythonPayload {
  codigo: string;
  codigoTeste?: string;
  stdin?: string;
  arquivos?: CodigoArquivo[];
  timeoutMs?: number;
}

interface WorkerRequest {
  codigo: string;
  stdin?: string;
  arquivos: CodigoArquivo[];
}

interface WorkerResult extends LocalPythonResult {
  type: "result";
}

interface WorkerFailure {
  type: "error";
  erro: string;
}

type WorkerMessage = WorkerResult | WorkerFailure;
type WorkerFactory = () => Worker;

export function montarCodigoValidacaoLocal(
  codigo: string,
  codigoTeste?: string,
): string {
  const teste = String(codigoTeste || "").trim();
  if (!teste) return codigo;

  return `${codigo.trimEnd()}\n\n${teste}`;
}

export function formatPythonUserError(error?: string): string | undefined {
  const normalized = String(error || "")
    .replace(/\r\n/g, "\n")
    .trim();
  if (!normalized) return undefined;

  const lines = normalized.split("\n");
  const mainIndex = lines.findIndex((line) => line.includes('File "main.py"'));
  if (mainIndex === -1) return normalized;

  const userLines: string[] = [];
  for (const line of lines.slice(mainIndex)) {
    if (/^\s+at\s/.test(line) || line.includes("pyodide.asm.wasm")) break;
    userLines.push(line);
  }

  return userLines.join("\n").trim() || normalized;
}

export function executarPythonLocal(
  payload: LocalPythonPayload,
  createWorker: WorkerFactory = createPyodideWorker,
) {
  return runPythonInBrowserWorker(
    {
      codigo: montarCodigoValidacaoLocal(payload.codigo, payload.codigoTeste),
      stdin: payload.stdin,
      arquivos: normalizeExtraFiles(payload.arquivos),
    },
    payload.timeoutMs ?? TIMEOUT_MS,
    createWorker,
  );
}

function runPythonInBrowserWorker(
  payload: WorkerRequest,
  timeoutMs: number,
  createWorker: WorkerFactory,
): Promise<LocalPythonResult> {
  return new Promise((resolve) => {
    const worker = createWorker();
    let settled = false;

    const finish = (result: LocalPythonResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      worker.removeEventListener("message", handleMessage);
      worker.removeEventListener("error", handleError);
      worker.terminate();
      resolve(result);
    };

    const timeout = setTimeout(() => {
      finish({ output: "", erro: TIMEOUT_MESSAGE });
    }, timeoutMs);

    const handleMessage = (event: MessageEvent<WorkerMessage>) => {
      const message = event.data;
      if (message.type === "result") {
        finish({
          output: message.output,
          erro: formatPythonUserError(message.erro),
        });
        return;
      }

      finish({ output: "", erro: formatPythonUserError(message.erro) });
    };

    const handleError = (event: ErrorEvent) => {
      finish({
        output: "",
        erro: event.message || "Erro ao executar validação local.",
      });
    };

    worker.addEventListener("message", handleMessage);
    worker.addEventListener("error", handleError);
    worker.postMessage(payload);
  });
}

function createPyodideWorker() {
  return new Worker(new URL("../workers/pyodide.worker.ts", import.meta.url), {
    type: "module",
  });
}

function normalizeExtraFiles(arquivos: CodigoArquivo[] = []): CodigoArquivo[] {
  const seen = new Set<string>();
  return arquivos
    .map((arquivo) => ({
      name: arquivo.name.trim().replace(/\\/g, "/").replace(/^\/+/, ""),
      content: arquivo.content ?? "",
    }))
    .filter((arquivo) => {
      if (!arquivo.name || arquivo.name === "main.py" || seen.has(arquivo.name))
        return false;
      if (!isSafePythonFileName(arquivo.name)) return false;
      seen.add(arquivo.name);
      return true;
    });
}

function isSafePythonFileName(name: string): boolean {
  return (
    name.endsWith(".py") &&
    !name.startsWith("/") &&
    !name.startsWith("\\") &&
    !name.includes("..") &&
    /^[A-Za-z0-9_./-]+$/.test(name)
  );
}
