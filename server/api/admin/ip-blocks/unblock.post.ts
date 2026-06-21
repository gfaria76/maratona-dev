import { requireTeacher } from '../../../utils/server-auth'
import {
  createSecurityEvent,
  getActiveMarathon,
  unblockIp,
  updateSessionsStatus,
} from '../../../utils/firestore-repositories'

export default defineEventHandler(async (event) => {
  const teacher = await requireTeacher(event)
  const body = await readBody<{
    ipAddress?: string
    sessionId?: string
    reason?: string
  }>(event)

  if (!body?.ipAddress && !body?.sessionId) {
    throw createError({ statusCode: 400, message: 'Informe IP ou sessão para desbloquear.' })
  }

  const marathon = await getActiveMarathon()

  if (body.ipAddress) {
    await unblockIp(marathon.id, {
      ipAddress: body.ipAddress,
      teacherEmail: teacher.email,
      reason: body.reason || 'Desbloqueado pelo professor.',
    })
  }

  if (body.sessionId) {
    await updateSessionsStatus(marathon.id, [body.sessionId], 'active', {
      block_reason: null,
      blocked_at: null,
    })
  }

  await createSecurityEvent(marathon.id, {
    session_id: body.sessionId || null,
    ip_address: body.ipAddress || null,
    email: teacher.email,
    event_type: 'manual_unblock',
    severity: 'normal',
    metadata: { reason: body.reason || 'Desbloqueado pelo professor.' },
  })

  return { ok: true }
})
