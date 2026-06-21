/**
 * GET /api/questoes
 *
 * Retorna as questões SEM testes e gabarito (dados públicos apenas).
 * Os testes e gabaritos nunca saem do servidor.
 */
import {
  getActiveMarathon,
  listPublicQuestions,
} from "../utils/firestore-repositories";

export default defineEventHandler(async () => {
  const marathon = await getActiveMarathon();
  return await listPublicQuestions(marathon.id);
});
