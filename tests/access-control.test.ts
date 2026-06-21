import { describe, expect, it } from 'vitest'
import {
  evaluateAccessAttempt,
  getSecurityScore,
  hasActiveSessionForUserIp,
  isTeacherEmail,
  isUfmsEmail,
  normalizeClientIp,
} from '../server/utils/access-control'

const ranges = [{ id: '1', cidr: '192.168.0.0/24', active: true }]

describe('access-control', () => {
  it('allows an UFMS user from an allowed IP with no conflicts', () => {
    const decision = evaluateAccessAttempt({
      userId: 'u1',
      email: 'aluno@ufms.br',
      ipAddress: '192.168.0.10',
      allowedRanges: ranges,
      activeSessions: [],
      blockedIps: [],
    })

    expect(decision.allowed).toBe(true)
    expect(decision.reason).toBe('allowed')
  })

  it('blocks same user entering from a second IP', () => {
    const decision = evaluateAccessAttempt({
      userId: 'u1',
      email: 'aluno@ufms.br',
      ipAddress: '192.168.0.11',
      allowedRanges: ranges,
      activeSessions: [{
        id: 's1',
        userId: 'u1',
        email: 'aluno@ufms.br',
        ipAddress: '192.168.0.10',
        status: 'active',
      }],
      blockedIps: [],
    })

    expect(decision.allowed).toBe(false)
    expect(decision.reason).toBe('same_user_new_ip')
    expect(decision.ipsToBlock).toEqual(['192.168.0.11', '192.168.0.10'])
  })

  it('normalizes localhost and recognizes teacher/UFMS emails', () => {
    expect(normalizeClientIp('::1')).toBe('127.0.0.1')
    expect(normalizeClientIp('::ffff:127.0.0.1')).toBe('127.0.0.1')
    expect(normalizeClientIp(undefined, 'localhost:3000')).toBe('127.0.0.1')
    expect(isUfmsEmail('ALUNO@UFMS.BR')).toBe(true)
    expect(isTeacherEmail('gedson.faria@ufms.br')).toBe(true)
  })

  it('scores security events by severity', () => {
    expect(getSecurityScore({ focusLosses: 0, fullscreenExits: 0, largePastes: 0 })).toBe('normal')
    expect(getSecurityScore({ focusLosses: 2, fullscreenExits: 1, largePastes: 0 })).toBe('attention')
    expect(getSecurityScore({ focusLosses: 1, fullscreenExits: 3, largePastes: 1 })).toBe('critical')
  })

  it('requires an active session for protected exam actions', () => {
    const sessions = [{
      id: 's1',
      userId: 'u1',
      email: 'aluno@ufms.br',
      ipAddress: '192.168.0.10',
      status: 'active' as const,
    }]

    expect(hasActiveSessionForUserIp(sessions, 'u1', '192.168.0.10')).toBe(true)
    expect(hasActiveSessionForUserIp(sessions, 'u1', '192.168.0.11')).toBe(false)
    expect(hasActiveSessionForUserIp([{ ...sessions[0], status: 'finished' }], 'u1', '192.168.0.10')).toBe(false)
  })
})
