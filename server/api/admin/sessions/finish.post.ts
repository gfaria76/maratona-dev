import { requireTeacher } from '../../../utils/server-auth'
import { createSecurityEvent, getActiveMarathon, updateSessionsStatus } from '../../../utils/firestore-repositories'

export default defineEventHandler(async (event) => {
  const teacher = await requireTeacher(event)
  const body = await readBody<{ sessionId?: string; reason?: string }>(event)

  if (!body?.sessionId) {
    throw createError({ statusCode: 400, message: 'Informe a sessão para encerrar.' })
  }

  const marathon = await getActiveMarathon()
  await updateSessionsStatus(marathon.id, [body.sessionId], 'finished', {
    finished_at: new Date().toISOString(),
  })

  await createSecurityEvent(marathon.id, {
    session_id: body.sessionId,
    email: teacher.email,
    ip_address: null,
    event_type: 'manual_finish_session',
    severity: 'normal',
    metadata: {
      reason: body.reason || 'Sessão encerrada pelo professor.',
    },
  })

  return { ok: true }
})
