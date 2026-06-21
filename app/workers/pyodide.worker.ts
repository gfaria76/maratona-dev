import { loadPyodide } from "pyodide";
import type { CodigoArquivo } from "#shared/types/exam";

interface WorkerRequest {
  codigo: string;
  stdin?: string;
  arquivos: CodigoArquivo[];
}

interface WorkerResult {
  type: "result" | "error";
  output?: string;
  erro?: string;
}

function splitInput(input?: string) {
  if (!input) return [];
  return String(input).replace(/\r\n/g, "\n").split("\n");
}

function dirname(fileName: string) {
  const index = fileName.lastIndexOf("/");
  return index === -1 ? "" : fileName.slice(0, index);
}

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  try {
    const pyodide = await loadPyodide();
    const stdout: string[] = [];
    const stderr: string[] = [];
    const inputLines = splitInput(event.data.stdin);

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
      stdin: () => inputLines.shift() ?? null,
    });

    pyodide.runPython('import os\nos.chdir("/home/pyodide")');

    for (const arquivo of event.data.arquivos || []) {
      const name = String(arquivo.name || "")
        .replace(/\\/g, "/")
        .replace(/^\/+/, "");
      const parent = dirname(name);
      if (parent) {
        pyodide.FS.mkdirTree(`/home/pyodide/${parent}`);
      }
      pyodide.FS.writeFile(
        `/home/pyodide/${name}`,
        String(arquivo.content || ""),
      );
    }

    try {
      await pyodide.runPythonAsync(String(event.data.codigo || ""), {
        filename: "main.py",
      });
      postResult({
        type: "result",
        output: stdout.join(""),
        erro: stderr.join("") || undefined,
      });
    } catch (error) {
      postResult({
        type: "result",
        output: stdout.join(""),
        erro: stderr.join("") || getErrorMessage(error),
      });
    }
  } catch (error) {
    postResult({ type: "error", erro: getErrorMessage(error) });
  }
};

function postResult(message: WorkerResult) {
  self.postMessage(message);
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.stack || error.message;
  return String(error);
}
