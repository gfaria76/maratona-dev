/**
 * POST /api/submeter
 *
 * Autocorreção segura: recebe o código do aluno, valida impedimentos,
 * executa os testes server-side e retorna os resultados.
 *
 * Os testes e gabaritos NUNCA são enviados ao cliente.
 */
import type {
  CodigoArquivo,
  ResultadoCorrecao,
  ResultadoTeste,
} from "#shared/types/exam";
import { validarImpedimentos, executarTestes } from "../utils/python-runner";
import {
  getRequestIp,
  requireExamUser,
  type CurrentExamUser,
} from "../utils/server-auth";
import {
  createSecurityEvent,
  createSubmission,
  findActiveSessionId,
  getActiveMarathon,
  getQuestionWithTests,
} from "../utils/firestore-repositories";

export default defineEventHandler(async (event): Promise<ResultadoCorrecao> => {
  const user = await requireExamUser(event);
  const ipAddress = getRequestIp(event);
  const marathon = await getActiveMarathon();
  const body = await readBody<{
    questaoId: number;
    codigo: string;
    arquivos?: CodigoArquivo[];
  }>(event);

  if (!body?.questaoId || !body?.codigo) {
    throw createError({
      statusCode: 400,
      message: 'Campos "questaoId" e "codigo" são obrigatórios.',
    });
  }

  const questao = await getQuestionWithTests(marathon.id, body.questaoId);

  if (!questao) {
    throw createError({
      statusCode: 404,
      message: `Questão ${body.questaoId} não encontrada.`,
    });
  }

  // 1. Validate impediments
  const arquivos = Array.isArray(body.arquivos) ? body.arquivos : [];
  const sessionId = await findActiveSessionId(marathon.id, user.id, ipAddress);
  const codigoCompleto = [
    body.codigo,
    ...arquivos.map((arquivo) => arquivo.content),
  ].join("\n");
  const impedimentosViolados = validarImpedimentos(
    codigoCompleto,
    questao.impedimentos,
  );

  if (impedimentosViolados.length > 0) {
    const resultado: ResultadoCorrecao = {
      questaoId: body.questaoId,
      acertos: 0,
      total: questao.testes.length,
      passou: false,
      impedimentosViolados,
      detalhes: [],
      erro: "Impedimentos violados. Corrija seu código e tente novamente.",
    };

    await saveSubmissionAudit(marathon.id, {
      user,
      ipAddress,
      sessionId,
      questaoId: body.questaoId,
      codigo: body.codigo,
      arquivos,
      acertos: 0,
      total: questao.testes.length,
      status: "erro",
      erro: resultado.erro,
      eventType: "validation_failed",
      severity: "attention",
      metadata: { impedimentosViolados },
    });

    return {
      ...resultado,
    };
  }

  // 2. Execute tests server-side
  const resultadosTestes = await executarTestes(
    body.codigo,
    questao.funcao_nome,
    questao.testes,
    arquivos,
  );

  // 3. Build response
  const acertos = resultadosTestes.filter((r) => r.passou).length;
  const total = questao.testes.length;

  // Build details (conditionally include entrada/esperado based on config)
  const detalhes: ResultadoTeste[] = resultadosTestes.map((r, i) => {
    const detalhe: ResultadoTeste = {
      indice: i + 1,
      passou: r.passou,
      obtido: r.obtido,
      saida: r.saida,
      erro: r.erro,
    };

    // Only include test inputs/expected if marathon config allows
    if (marathon.mostrar_detalhes_testes) {
      detalhe.entrada = questao.testes[i]?.entrada;
      detalhe.esperado = questao.testes[i]?.esperado;
    }

    return detalhe;
  });

  const resultado: ResultadoCorrecao = {
    questaoId: body.questaoId,
    acertos,
    total,
    passou: acertos === total,
    impedimentosViolados: [],
    detalhes,
  };
  const hasExecutionError = detalhes.some((detalhe) => detalhe.erro);
  const executionError =
    detalhes.find((detalhe) => detalhe.erro)?.obtido ||
    detalhes.find((detalhe) => detalhe.erro)?.saida ||
    null;
  const status = hasExecutionError
    ? "erro"
    : acertos === total
      ? "correta"
      : "incorreta";

  // 4. Try to save to Firestore (non-blocking)
  await saveSubmissionAudit(marathon.id, {
    user,
    ipAddress,
    sessionId,
    questaoId: body.questaoId,
    codigo: body.codigo,
    arquivos,
    acertos,
    total,
    status,
    erro: executionError,
    eventType: "submission_result",
    severity: resultado.passou ? "normal" : "attention",
    metadata: {
      acertos,
      total,
      percentual: total > 0 ? Math.round((acertos / total) * 100) : 0,
      status,
    },
  });

  return resultado;
});

async function saveSubmissionAudit(
  marathonId: string,
  payload: {
    user: CurrentExamUser;
    ipAddress: string;
    sessionId: string | null;
    questaoId: number;
    codigo: string;
    arquivos: CodigoArquivo[];
    acertos: number;
    total: number;
    status: "correta" | "incorreta" | "erro";
    erro?: string | null;
    eventType: "validation_failed" | "submission_result";
    severity: "normal" | "attention" | "critical";
    metadata: Record<string, unknown>;
  },
) {
  try {
    const respostaId = await createSubmission(marathonId, {
      questao_id: payload.questaoId,
      user_id: payload.user.id,
      email: payload.user.email,
      session_id: payload.sessionId,
      ip_address: payload.ipAddress,
      codigo: payload.codigo,
      codigo_arquivos: payload.arquivos.map((arquivo) => ({
        name: arquivo.name,
        content: arquivo.content,
      })),
      acertos: payload.acertos,
      total_testes: payload.total,
      status: payload.status,
      erro: payload.erro || null,
    });

    await createSecurityEvent(marathonId, {
      session_id: payload.sessionId,
      user_id: payload.user.id,
      email: payload.user.email,
      ip_address: payload.ipAddress,
      event_type: payload.eventType,
      severity: payload.severity,
      metadata: {
        ...payload.metadata,
        questaoId: payload.questaoId,
        respostaId,
      },
    });
  } catch (e) {
    // Firestore save is non-critical; don't fail the response.
    console.warn("[Firestore] Falha ao salvar auditoria da resposta:", e);
  }
}
