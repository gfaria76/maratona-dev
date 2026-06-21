import { requireTeacher } from '../../utils/server-auth'
import { getActiveMarathon, upsertAllowedIpRange } from '../../utils/firestore-repositories'

export default defineEventHandler(async (event) => {
  const teacher = await requireTeacher(event)
  const body = await readBody<{
    id?: string
    label?: string
    cidr?: string
    active?: boolean
  }>(event)

  if (!body?.label || !body?.cidr) {
    throw createError({ statusCode: 400, message: 'Informe nome e faixa CIDR.' })
  }

  const marathon = await getActiveMarathon()
  return await upsertAllowedIpRange(marathon.id, {
    id: body.id,
    label: body.label,
    cidr: body.cidr,
    active: body.active ?? true,
    teacherEmail: teacher.email,
  })
})
