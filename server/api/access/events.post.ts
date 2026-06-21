import { getSecurityScore } from '../../utils/access-control'
import { getRequestIp, requireExamUser } from '../../utils/server-auth'
import { countSecurityEvents, createSecurityEvent, getActiveMarathon } from '../../utils/firestore-repositories'

const allowedEvents = new Set([
  'fullscreen_exit',
  'visibility_hidden',
  'visibility_visible',
  'window_blur',
  'window_focus',
  'large_paste',
  'manual_warning',
])

export default defineEventHandler(async (event) => {
  const user = await requireExamUser(event)
  const body = await readBody<{
    sessionId?: string
    eventType?: string
    metadata?: Record<string, unknown>
  }>(event)

  if (!body?.sessionId || !body?.eventType || !allowedEvents.has(body.eventType)) {
    throw createError({ statusCode: 400, message: 'Evento de segurança inválido.' })
  }

  const marathon = await getActiveMarathon()
  const ipAddress = getRequestIp(event)

  const [focusLosses, fullscreenExits, largePastes] = await Promise.all([
    countSecurityEvents(marathon.id, body.sessionId, ['visibility_hidden', 'window_blur']),
    countSecurityEvents(marathon.id, body.sessionId, ['fullscreen_exit']),
    countSecurityEvents(marathon.id, body.sessionId, ['large_paste']),
  ])

  const nextCounts = {
    focusLosses: focusLosses + (['visibility_hidden', 'window_blur'].includes(body.eventType) ? 1 : 0),
    fullscreenExits: fullscreenExits + (body.eventType === 'fullscreen_exit' ? 1 : 0),
    largePastes: largePastes + (body.eventType === 'large_paste' ? 1 : 0),
  }
  const severity = getSecurityScore(nextCounts)

  await createSecurityEvent(marathon.id, {
    session_id: body.sessionId,
    user_id: user.id,
    email: user.email,
    ip_address: ipAddress,
    event_type: body.eventType,
    severity,
    metadata: body.metadata || {},
  })

  return { ok: true, severity }
})
