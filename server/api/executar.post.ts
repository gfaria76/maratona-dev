/**
 * POST /api/executar
 *
 * Executa código Python livremente (botão "Executar/Testar").
 * Não faz correção, apenas roda o código e retorna stdout/stderr.
 */
import { executarPython, montarCodigoValidacao } from '../utils/python-runner'
import { getActiveMarathon, findActiveSessionId } from '../utils/firestore-repositories'
import { getRequestIp, requireExamUser } from '../utils/server-auth'
import type { CodigoArquivo } from '#shared/types/exam'

export default defineEventHandler(async (event) => {
  const user = await requireExamUser(event)
  const ipAddress = getRequestIp(event)
  const marathon = await getActiveMarathon()
  const sessionId = await findActiveSessionId(marathon.id, user.id, ipAddress)

  if (!sessionId) {
    throw createError({
      statusCode: 403,
      message: 'Sessão ativa obrigatória para executar código.',
    })
  }

  const body = await readBody<{ codigo: string; codigoTeste?: string; inputs?: string; arquivos?: CodigoArquivo[] }>(event)

  if (!body?.codigo) {
    throw createError({ statusCode: 400, message: 'Campo "codigo" é obrigatório.' })
  }

  const resultado = await executarPython(montarCodigoValidacao(body.codigo, body.codigoTeste), body.inputs, body.arquivos)

  return resultado
})
