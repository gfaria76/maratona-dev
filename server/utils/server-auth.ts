import { getRequestHost, getRequestIP, type H3Event } from 'h3'
import { isTeacherEmail, isUfmsEmail, normalizeClientIp } from './access-control'
import { getAdminAuth } from './firebase-admin'

export interface CurrentExamUser {
  id: string
  email: string
  isTeacher: boolean
}

export async function requireExamUser(event: H3Event): Promise<CurrentExamUser> {
  const token = getBearerToken(event) || getCookie(event, 'firebase_id_token') || ''
  if (!token) {
    throw createError({ statusCode: 401, message: 'Login obrigatório.' })
  }

  const decoded = await getAdminAuth().verifyIdToken(token)
  const id = String(decoded.uid || '')
  const email = String(decoded.email || '').toLowerCase()

  if (!id || !email) {
    throw createError({ statusCode: 401, message: 'Login obrigatório.' })
  }

  if (!isUfmsEmail(email)) {
    throw createError({ statusCode: 403, message: 'Apenas emails @ufms.br são permitidos.' })
  }

  return {
    id,
    email,
    isTeacher: isTeacherEmail(email),
  }
}

export async function requireTeacher(event: H3Event): Promise<CurrentExamUser> {
  const user = await requireExamUser(event)

  if (!user.isTeacher) {
    throw createError({ statusCode: 403, message: 'Acesso restrito a professores.' })
  }

  return user
}

export function getRequestIp(event: H3Event): string {
  return normalizeClientIp(
    getHeader(event, 'x-forwarded-for')
      || getHeader(event, 'x-real-ip')
      || getRequestIP(event, { xForwardedFor: true })
      || event.node.req.socket.remoteAddress
      || undefined,
    getRequestHost(event, { xForwardedHost: true })
  )
}

function getBearerToken(event: H3Event) {
  const authorization = getHeader(event, 'authorization') || ''
  const match = authorization.match(/^Bearer\s+(.+)$/i)
  return match?.[1] || ''
}
