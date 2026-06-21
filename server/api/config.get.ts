/**
 * GET /api/config
 *
 * Retorna configuração da maratona ativa (pública).
 */
import { getActiveMarathonConfig } from '../utils/firestore-repositories'

export default defineEventHandler(async () => {
  return await getActiveMarathonConfig()
})
