import { access, readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  executarPythonLocal,
  formatPythonUserError,
  montarCodigoValidacaoLocal,
} from "../app/utils/local-python-runner";
import type { CodigoArquivo } from "../shared/types/exam";

interface PostedPayload {
  codigo: string;
  stdin?: string;
  arquivos: CodigoArquivo[];
}

class FakeWorker {
  payload?: PostedPayload;
  terminated = false;
  private listeners: Record<
    string,
    Array<(event: MessageEvent | ErrorEvent) => void>
  > = {};

  constructor(
    private readonly respond?: (
      worker: FakeWorker,
      payload: PostedPayload,
    ) => void,
  ) {}

  addEventListener(
    type: string,
    listener: (event: MessageEvent | ErrorEvent) => void,
  ) {
    this.listeners[type] = [...(this.listeners[type] || []), listener];
  }

  removeEventListener(
    type: string,
    listener: (event: MessageEvent | ErrorEvent) => void,
  ) {
    this.listeners[type] = (this.listeners[type] || []).filter(
      (current) => current !== listener,
    );
  }

  postMessage(payload: PostedPayload) {
    this.payload = payload;
    this.respond?.(this, payload);
  }

  terminate() {
    this.terminated = true;
  }

  emitMessage(data: unknown) {
    for (const listener of this.listeners.message || []) {
      listener({ data } as MessageEvent);
    }
  }
}

describe("local browser validation contract", () => {
  it("appends question validation code locally", () => {
    expect(montarCodigoValidacaoLocal("x = 1", "print(x)")).toBe(
      "x = 1\n\nprint(x)",
    );
    expect(montarCodigoValidacaoLocal("x = 1", "")).toBe("x = 1");
  });

  it("sends validation code, stdin and helper files to the browser worker", async () => {
    const worker = new FakeWorker((current) => {
      current.emitMessage({ type: "result", output: "Oi Ana\n" });
    });

    const result = await executarPythonLocal(
      {
        codigo: "nome = input()",
        codigoTeste: 'print("Oi", nome)',
        stdin: "Ana\n",
        arquivos: [
          { name: "main.py", content: "ignored" },
          { name: "helper.py", content: "def dobro(x): return x * 2" },
        ],
      },
      () => worker as unknown as Worker,
    );

    expect(result).toEqual({ output: "Oi Ana\n", erro: undefined });
    expect(worker.payload).toEqual({
      codigo: 'nome = input()\n\nprint("Oi", nome)',
      stdin: "Ana\n",
      arquivos: [{ name: "helper.py", content: "def dobro(x): return x * 2" }],
    });
    expect(worker.terminated).toBe(true);
  });

  it("returns local validation errors from the browser worker", async () => {
    const worker = new FakeWorker((current) => {
      current.emitMessage({
        type: "result",
        output: "antes\n",
        erro: "ValueError: falhou",
      });
    });

    const result = await executarPythonLocal(
      {
        codigo: 'print("antes")\nraise ValueError("falhou")',
      },
      () => worker as unknown as Worker,
    );

    expect(result.output).toBe("antes\n");
    expect(result.erro).toContain("ValueError");
  });

  it("formats Python errors to show only the user traceback", () => {
    const rawError = `PythonError: Traceback (most recent call last):
  File "/lib/python312.zip/_pyodide/_base.py", line 597, in eval_code_async
  File "main.py", line 7, in <module>
    print(somar_lista())
          ~~~~~~~~~~~^^
TypeError: somar_lista() missing 1 required positional argument: 'lista'
    at new_error (pyodide.asm.js:10:9965)
    at pyodide.asm.wasm`;

    expect(formatPythonUserError(rawError))
      .toBe(`File "main.py", line 7, in <module>
    print(somar_lista())
          ~~~~~~~~~~~^^
TypeError: somar_lista() missing 1 required positional argument: 'lista'`);
  });

  it("times out local validation without waiting for the worker", async () => {
    const worker = new FakeWorker();

    const result = await executarPythonLocal(
      {
        codigo: "while True:\n    pass",
        timeoutMs: 5,
      },
      () => worker as unknown as Worker,
    );

    expect(result).toEqual({
      output: "",
      erro: "Tempo limite excedido (10s). Verifique se há loops infinitos.",
    });
    expect(worker.terminated).toBe(true);
  });

  it("keeps validation code and stdin as public question data", async () => {
    const defs = JSON.parse(
      await readFile(
        new URL("../server/data/defs.json", import.meta.url),
        "utf-8",
      ),
    );

    for (const questao of defs.questoes) {
      expect(questao.codigo_teste).toEqual(expect.any(String));
      expect(questao.codigo_teste.length).toBeGreaterThan(0);
      expect(questao.stdin).toEqual(expect.any(String));
    }
  });

  it("does not route local validation through Nitro", async () => {
    const storeSource = await readFile(
      new URL("../app/stores/exam.ts", import.meta.url),
      "utf-8",
    );

    expect(storeSource).not.toContain("/api/executar");
    await expect(
      access(new URL("../server/api/executar.post.ts", import.meta.url)),
    ).rejects.toThrow();
  });

  it("keeps the local validation environment editable in the UI", async () => {
    const panelSource = await readFile(
      new URL("../app/components/IoPanel.vue", import.meta.url),
      "utf-8",
    );

    expect(panelSource).toContain('v-model="codigoTesteLocal"');
    expect(panelSource).toContain('v-model="stdinLocal"');
    expect(panelSource).not.toContain("readonly");
    expect(panelSource).toContain("codigoTesteLocal.value || undefined");
    expect(panelSource).toContain("stdinLocal.value || undefined");
  });

  it("stores local validation environment and output by question", async () => {
    const storeSource = await readFile(
      new URL("../app/stores/exam.ts", import.meta.url),
      "utf-8",
    );
    const panelSource = await readFile(
      new URL("../app/components/IoPanel.vue", import.meta.url),
      "utf-8",
    );

    expect(storeSource).toContain("validacoes");
    expect(storeSource).toContain("atualizarValidacaoLocal");
    expect(storeSource).toContain("validacoes.value[questaoId]");
    expect(storeSource).toMatch(
      /async function executar\(\s*questaoId: number/,
    );
    expect(panelSource).toContain("validacaoAtual");
    expect(panelSource).not.toContain("watch(() => props.questaoId");
  });
});
