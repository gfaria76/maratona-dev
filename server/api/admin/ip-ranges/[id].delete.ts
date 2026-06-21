import { requireTeacher } from '../../../utils/server-auth'
import { deleteAllowedIpRange, getActiveMarathon } from '../../../utils/firestore-repositories'

export default defineEventHandler(async (event) => {
  await requireTeacher(event)

  const id = String(getRouterParam(event, 'id') || '')
  if (!id) {
    throw createError({ statusCode: 400, message: 'Faixa de IP inválida.' })
  }

  const marathon = await getActiveMarathon()
  await deleteAllowedIpRange(marathon.id, id)

  return { ok: true }
})
