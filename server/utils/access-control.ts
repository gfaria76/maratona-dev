export type AccessDenyReason =
  | 'allowed'
  | 'ip_not_allowed'
  | 'blocked_ip'
  | 'same_user_new_ip'
  | 'same_ip_other_user'

export type SecurityScore = 'normal' | 'attention' | 'critical'

export interface AllowedIpRange {
  id: number | string
  cidr: string
  active: boolean
}

export interface ActiveExamSession {
  id: number | string
  userId: string
  email: string
  ipAddress: string
  status: 'active' | 'blocked' | 'finished'
}

export interface BlockedIp {
  ipAddress: string
  active: boolean
  reason: string
}

export interface AccessAttempt {
  userId: string
  email: string
  ipAddress: string
  allowedRanges: AllowedIpRange[]
  activeSessions: ActiveExamSession[]
  blockedIps: BlockedIp[]
}

export interface AccessDecision {
  allowed: boolean
  reason: AccessDenyReason
  ipsToBlock: string[]
  conflictingSessionIds: Array<number | string>
  sessionToRenewId?: number | string
}

export interface SecurityEventCounts {
  focusLosses: number
  fullscreenExits: number
  largePastes: number
}

export const TEACHER_EMAILS = [
  'gedson.faria@ufms.br',
  'ekler.mattos@ufms.br',
  'angelo.brun@ufms.br',
  'kleber.kruger@ufms.br',
  'silvana.zanchet@ufms.br',
  'glasielly.proenca@ufms.br',
  'juliana.wolf@ufms.br',
  'deiviston.aguena@ufms.br',
]

export function isTeacherEmail(email?: string | null): boolean {
  return !!email && TEACHER_EMAILS.includes(email.toLowerCase())
}

export function isUfmsEmail(email?: string | null): boolean {
  return !!email && email.toLowerCase().endsWith('@ufms.br')
}

export function isIpAllowed(ipAddress: string, ranges: AllowedIpRange[]): boolean {
  const ip = ipv4ToNumber(ipAddress)
  if (ip === null) return false

  return ranges.some((range) => {
    if (!range.active) return false
    const parsed = parseCidr(range.cidr)
    if (!parsed) return false
    const mask = parsed.prefix === 0 ? 0 : (0xffffffff << (32 - parsed.prefix)) >>> 0
    return (ip & mask) === (parsed.base & mask)
  })
}

export function evaluateAccessAttempt(attempt: AccessAttempt): AccessDecision {
  const activeSessions = attempt.activeSessions.filter((session) => session.status === 'active')
  const currentIpSessions = activeSessions.filter((session) => session.ipAddress === attempt.ipAddress)

  if (!isIpAllowed(attempt.ipAddress, attempt.allowedRanges)) {
    return deny('ip_not_allowed', currentIpSessions.map((session) => session.id))
  }

  const blockedIp = attempt.blockedIps.find(
    (block) => block.active && block.ipAddress === attempt.ipAddress
  )
  if (blockedIp) {
    return deny('blocked_ip', currentIpSessions.map((session) => session.id))
  }

  const sameUserSessions = activeSessions.filter((session) => session.userId === attempt.userId)
  const sameIpOtherUserSessions = activeSessions.filter(
    (session) => session.ipAddress === attempt.ipAddress && session.userId !== attempt.userId
  )
  const sameUserSameIpSession = sameUserSessions.find(
    (session) => session.ipAddress === attempt.ipAddress
  )
  const sameUserOtherIpSessions = sameUserSessions.filter(
    (session) => session.ipAddress !== attempt.ipAddress
  )

  if (sameUserOtherIpSessions.length > 0) {
    return {
      allowed: false,
      reason: 'same_user_new_ip',
      ipsToBlock: unique([attempt.ipAddress, ...sameUserOtherIpSessions.map((session) => session.ipAddress)]),
      conflictingSessionIds: sameUserOtherIpSessions.map((session) => session.id),
    }
  }

  if (sameIpOtherUserSessions.length > 0) {
    return {
      allowed: false,
      reason: 'same_ip_other_user',
      ipsToBlock: [attempt.ipAddress],
      conflictingSessionIds: sameIpOtherUserSessions.map((session) => session.id),
    }
  }

  return {
    allowed: true,
    reason: 'allowed',
    ipsToBlock: [],
    conflictingSessionIds: [],
    sessionToRenewId: sameUserSameIpSession?.id,
  }
}

export function hasActiveSessionForUserIp(
  sessions: ActiveExamSession[],
  userId: string,
  ipAddress: string
): boolean {
  return sessions.some((session) => (
    session.status === 'active' &&
    session.userId === userId &&
    session.ipAddress === ipAddress
  ))
}

export function getSecurityScore(counts: SecurityEventCounts): SecurityScore {
  const score = counts.focusLosses + counts.fullscreenExits * 2 + counts.largePastes * 3
  if (score >= 10) return 'critical'
  if (score >= 4) return 'attention'
  return 'normal'
}

export function normalizeClientIp(headerValue: string | string[] | undefined, fallbackHost?: string): string {
  const value = Array.isArray(headerValue) ? headerValue[0] : headerValue
  const firstIp = value?.split(',')[0]?.trim() || ''

  if (!firstIp && isLocalhostHost(fallbackHost)) return '127.0.0.1'

  if (firstIp === '::1') return '127.0.0.1'
  if (firstIp.startsWith('::ffff:')) return firstIp.replace('::ffff:', '')

  return firstIp || '0.0.0.0'
}

function deny(reason: AccessDenyReason, conflictingSessionIds: Array<number | string> = []): AccessDecision {
  return {
    allowed: false,
    reason,
    ipsToBlock: [],
    conflictingSessionIds,
  }
}

function parseCidr(cidr: string): { base: number; prefix: number } | null {
  const [baseIp, prefixText] = cidr.split('/')
  if (!baseIp) return null

  const base = ipv4ToNumber(baseIp)
  const prefix = Number(prefixText ?? '32')

  if (base === null || !Number.isInteger(prefix) || prefix < 0 || prefix > 32) {
    return null
  }

  return { base, prefix }
}

function ipv4ToNumber(ipAddress: string): number | null {
  const parts = ipAddress.split('.')
  if (parts.length !== 4) return null

  let result = 0
  for (const part of parts) {
    if (!/^\d+$/.test(part)) return null
    const octet = Number(part)
    if (octet < 0 || octet > 255) return null
    result = (result << 8) + octet
  }

  return result >>> 0
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values))
}

function isLocalhostHost(host?: string) {
  const normalized = String(host || '').split(':')[0]?.toLowerCase()
  return normalized === 'localhost' || normalized === '127.0.0.1' || normalized === '[::1]' || normalized === '::1'
}
