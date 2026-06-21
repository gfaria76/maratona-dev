import { evaluateAccessAttempt, getSecurityScore } from '../../utils/access-control'
import { getRequestIp, requireExamUser } from '../../utils/server-auth'
import {
  countSecurityEvents,
  createIpBlocks,
  createSecurityEvent,
  createSession,
  getActiveMarathon,
  listActiveBlocks,
  listActiveSessions,
  listAllowedIpRanges,
  renewSession,
  updateSessionsStatus,
} from '../../utils/firestore-repositories'

export default defineEventHandler(async (event) => {
  const user = await requireExamUser(event)
  const ipAddress = getRequestIp(event)
  const marathon = await getActiveMarathon()

  const [allowedRanges, blockedIps, activeSessions] = await Promise.all([
    listAllowedIpRanges(marathon.id),
    listActiveBlocks(marathon.id),
    listActiveSessions(marathon.id),
  ])

  const decision = evaluateAccessAttempt({
    userId: user.id,
    email: user.email,
    ipAddress,
    allowedRanges: (allowedRanges || []).map((range) => ({
      id: range.id,
      cidr: String(range.cidr),
      active: Boolean(range.active),
    })),
    blockedIps: (blockedIps || []).map((block) => ({
      ipAddress: String(block.ip_address),
      active: Boolean(block.active),
      reason: String(block.reason),
    })),
    activeSessions: (activeSessions || []).map((session) => ({
      id: session.id,
      userId: String(session.user_id),
      email: String(session.email),
      ipAddress: String(session.ip_address),
      status: session.status as 'active' | 'blocked' | 'finished',
    })),
  })

  if (!decision.allowed) {
    if (decision.ipsToBlock.length > 0) {
      await createIpBlocks(marathon.id, decision.ipsToBlock, decision.reason, decision.conflictingSessionIds)
    }

    if (decision.conflictingSessionIds.length > 0) {
      await updateSessionsStatus(marathon.id, decision.conflictingSessionIds, 'blocked', {
        blocked_at: new Date().toISOString(),
        block_reason: decision.reason,
      })
    }

    await createSecurityEvent(marathon.id, {
      user_id: user.id,
      email: user.email,
      ip_address: ipAddress,
      event_type: decision.reason,
      severity: 'critical',
      metadata: { ipsToBlock: decision.ipsToBlock, conflictingSessionIds: decision.conflictingSessionIds },
    })

    return {
      allowed: false,
      reason: decision.reason,
      ipAddress,
    }
  }

  let sessionId = decision.sessionToRenewId

  if (sessionId) {
    await renewSession(marathon.id, sessionId)
  } else {
    sessionId = await createSession(marathon.id, {
      userId: user.id,
      email: user.email,
      ipAddress,
    })
  }

  const [focusLosses, fullscreenExits, largePastes] = await Promise.all([
    countSecurityEvents(marathon.id, sessionId, ['visibility_hidden', 'window_blur']),
    countSecurityEvents(marathon.id, sessionId, ['fullscreen_exit']),
    countSecurityEvents(marathon.id, sessionId, ['large_paste']),
  ])

  return {
    allowed: true,
    reason: 'allowed',
    ipAddress,
    sessionId,
    securityScore: getSecurityScore({
      focusLosses,
      fullscreenExits,
      largePastes,
    }),
  }
})
