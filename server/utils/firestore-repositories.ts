import type { DocumentData, QueryDocumentSnapshot, WriteBatch } from 'firebase-admin/firestore'
import type { ConfigProva, Questao, QuestaoPublica, TesteCase } from '#shared/types/exam'
import { getAdminFirestore } from './firebase-admin'

export interface MarathonRecord {
  id: string
  titulo: string
  duracao_minutos: number
  mostrar_detalhes_testes: boolean
  mensagem_boas_vindas: string
  active: boolean
}

export interface FirestoreSecurityEvent {
  id?: string
  session_id?: string | null
  user_id?: string | null
  email?: string | null
  ip_address?: string | null
  event_type: string
  severity: 'normal' | 'attention' | 'critical'
  metadata?: Record<string, unknown>
  created_at?: string
}

export interface FirestoreSubmission {
  id?: string
  questao_id: number
  user_id?: string | null
  email?: string | null
  session_id?: string | null
  ip_address?: string | null
  codigo?: string
  codigo_arquivos?: Array<{ name: string; content: string }>
  acertos: number
  total_testes: number
  status?: string | null
  erro?: string | null
  created_at?: string | null
}

export interface FirestoreAllowedIpRange {
  id: string
  label?: string
  cidr?: string
  active?: boolean
  created_by_email?: string
  created_at?: string
  updated_at?: string
}

export interface FirestoreIpBlock {
  id: string
  ip_address?: string
  active?: boolean
  reason?: string
  blocked_at?: string
  unblocked_at?: string
}

export interface FirestoreSession {
  id: string
  user_id?: string
  email?: string
  ip_address?: string
  status?: 'active' | 'blocked' | 'finished'
  started_at?: string
  last_seen_at?: string
}

export function nowIso() {
  return new Date().toISOString()
}

export async function getActiveMarathon(): Promise<MarathonRecord> {
  const snapshot = await getAdminFirestore()
    .collection('marathons')
    .where('active', '==', true)
    .limit(1)
    .get()

  const doc = snapshot.docs[0]
  if (!doc) {
    throw createError({
      statusCode: 404,
      message: 'Nenhuma maratona ativa encontrada no Firestore.',
    })
  }

  return normalizeMarathon(doc)
}

export async function getActiveMarathonConfig(): Promise<ConfigProva> {
  const marathon = await getActiveMarathon()
  return {
    titulo: marathon.titulo,
    duracao_minutos: marathon.duracao_minutos,
    mostrar_detalhes_testes: marathon.mostrar_detalhes_testes,
    mensagem_boas_vindas: marathon.mensagem_boas_vindas,
  }
}

export async function listPublicQuestions(marathonId: string): Promise<QuestaoPublica[]> {
  const snapshot = await questionsCollection(marathonId).get()
  return snapshot.docs
    .map((doc) => toPublicQuestion(normalizeQuestion(doc, [])))
    .sort((a, b) => a.id - b.id)
}

export async function listScoreQuestions(marathonId: string) {
  const questions = await listPublicQuestions(marathonId)
  return questions.map((questao) => ({
    id: questao.id,
    titulo: questao.titulo,
  }))
}

export async function getQuestionWithTests(marathonId: string, questaoId: number): Promise<Questao | null> {
  const snapshot = await questionsCollection(marathonId)
    .where('id', '==', questaoId)
    .limit(1)
    .get()
  const questionDoc = snapshot.docs[0] || await fallbackQuestionDoc(marathonId, questaoId)

  if (!questionDoc) return null

  const testsSnapshot = await questionDoc.ref.collection('tests').get()
  const tests = testsSnapshot.docs
    .map(normalizeTest)
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
    .map(({ entrada, esperado }) => ({ entrada, esperado }))

  return normalizeQuestion(questionDoc, tests)
}

export async function listAllowedIpRanges(marathonId: string): Promise<FirestoreAllowedIpRange[]> {
  const snapshot = await marathonCollection(marathonId, 'allowedIpRanges').get()
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as FirestoreAllowedIpRange)
}

export async function upsertAllowedIpRange(
  marathonId: string,
  range: { id?: string; label: string; cidr: string; active: boolean; teacherEmail: string }
) {
  const date = nowIso()
  const payload = {
    label: range.label,
    cidr: range.cidr,
    active: range.active,
    created_by_email: range.teacherEmail,
    updated_at: date,
  }
  const collection = marathonCollection(marathonId, 'allowedIpRanges')
  const ref = range.id ? collection.doc(range.id) : collection.doc()
  const existing = await ref.get()

  await ref.set({
    ...payload,
    created_at: existing.exists ? existing.data()?.created_at || date : date,
  }, { merge: true })

  return { id: ref.id, ...(await ref.get()).data() }
}

export async function deleteAllowedIpRange(marathonId: string, id: string) {
  await marathonCollection(marathonId, 'allowedIpRanges').doc(id).delete()
}

export async function listIpBlocks(marathonId: string): Promise<FirestoreIpBlock[]> {
  const snapshot = await marathonCollection(marathonId, 'ipBlocks').get()
  return snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }) as FirestoreIpBlock)
    .sort(descByDate('blocked_at'))
}

export async function listSecurityEvents(marathonId: string, limit = 150) {
  const snapshot = await marathonCollection(marathonId, 'securityEvents').get()
  return snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .sort(descByDate('created_at'))
    .slice(0, limit)
}

export async function listSessions(marathonId: string, limit = 100): Promise<FirestoreSession[]> {
  const snapshot = await marathonCollection(marathonId, 'sessions').get()
  return snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }) as FirestoreSession)
    .sort(descByDate('last_seen_at'))
    .slice(0, limit)
}

export async function listSubmissions(marathonId: string, limit = 1000): Promise<FirestoreSubmission[]> {
  const snapshot = await marathonCollection(marathonId, 'submissions').get()
  return snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }) as FirestoreSubmission)
    .sort(descByDate('created_at'))
    .slice(0, limit)
}

export async function listActiveSessions(marathonId: string): Promise<FirestoreSession[]> {
  const snapshot = await marathonCollection(marathonId, 'sessions')
    .where('status', '==', 'active')
    .get()
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as FirestoreSession)
}

export async function listActiveBlocks(marathonId: string): Promise<FirestoreIpBlock[]> {
  const snapshot = await marathonCollection(marathonId, 'ipBlocks')
    .where('active', '==', true)
    .get()
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as FirestoreIpBlock)
}

export async function createIpBlocks(
  marathonId: string,
  ips: string[],
  reason: string,
  relatedSessionIds: Array<string | number>
) {
  const batch = getAdminFirestore().batch()
  const date = nowIso()
  for (const ipAddress of ips) {
    const ref = marathonCollection(marathonId, 'ipBlocks').doc()
    batch.set(ref, {
      ip_address: ipAddress,
      active: true,
      reason,
      related_session_ids: relatedSessionIds.map(String),
      blocked_at: date,
    })
  }
  await batch.commit()
}

export async function updateSessionsStatus(
  marathonId: string,
  sessionIds: Array<string | number>,
  status: 'active' | 'blocked' | 'finished',
  fields: Record<string, unknown> = {}
) {
  if (!sessionIds.length) return
  const batch = getAdminFirestore().batch()
  const date = nowIso()
  for (const sessionId of sessionIds) {
    batch.set(marathonCollection(marathonId, 'sessions').doc(String(sessionId)), {
      status,
      last_seen_at: date,
      ...fields,
    }, { merge: true })
  }
  await batch.commit()
}

export async function renewSession(marathonId: string, sessionId: string | number) {
  await marathonCollection(marathonId, 'sessions')
    .doc(String(sessionId))
    .set({ last_seen_at: nowIso() }, { merge: true })
}

export async function createSession(
  marathonId: string,
  payload: { userId: string; email: string; ipAddress: string }
) {
  const date = nowIso()
  const ref = marathonCollection(marathonId, 'sessions').doc()
  await ref.set({
    user_id: payload.userId,
    email: payload.email,
    ip_address: payload.ipAddress,
    status: 'active',
    started_at: date,
    last_seen_at: date,
  })
  return ref.id
}

export async function findActiveSessionId(marathonId: string, userId: string, ipAddress: string) {
  const snapshot = await marathonCollection(marathonId, 'sessions')
    .where('user_id', '==', userId)
    .where('ip_address', '==', ipAddress)
    .where('status', '==', 'active')
    .limit(1)
    .get()
  return snapshot.docs[0]?.id || null
}

export async function countSecurityEvents(
  marathonId: string,
  sessionId: string | number,
  eventTypes: string[]
) {
  const snapshot = await marathonCollection(marathonId, 'securityEvents')
    .where('session_id', '==', String(sessionId))
    .get()
  return snapshot.docs.filter((doc) => eventTypes.includes(String(doc.data().event_type))).length
}

export async function createSecurityEvent(marathonId: string, event: FirestoreSecurityEvent) {
  await marathonCollection(marathonId, 'securityEvents').add({
    ...event,
    session_id: event.session_id ? String(event.session_id) : null,
    created_at: event.created_at || nowIso(),
  })
}

export async function createSubmission(marathonId: string, submission: FirestoreSubmission) {
  const ref = await marathonCollection(marathonId, 'submissions').add({
    ...submission,
    created_at: submission.created_at || nowIso(),
  })
  return ref.id
}

export async function unblockIp(
  marathonId: string,
  payload: { ipAddress: string; teacherEmail: string; reason: string }
) {
  const snapshot = await marathonCollection(marathonId, 'ipBlocks')
    .where('ip_address', '==', payload.ipAddress)
    .where('active', '==', true)
    .get()
  const batch = getAdminFirestore().batch()
  const date = nowIso()
  snapshot.docs.forEach((doc) => {
    batch.set(doc.ref, {
      active: false,
      unblocked_by_email: payload.teacherEmail,
      unblocked_at: date,
      unblock_reason: payload.reason,
    }, { merge: true })
  })
  await commitIfNeeded(batch, snapshot.size)
}

export async function clearSecurityEvents(
  marathonId: string,
  filter: { severity?: 'all' | 'normal' | 'attention' | 'critical'; olderThanHours?: number }
) {
  const snapshot = await marathonCollection(marathonId, 'securityEvents').get()
  const cutoff = filter.olderThanHours && filter.olderThanHours > 0
    ? Date.now() - filter.olderThanHours * 60 * 60 * 1000
    : null
  const docs = snapshot.docs.filter((doc) => {
    const data = doc.data()
    if (filter.severity && filter.severity !== 'all' && data.severity !== filter.severity) return false
    if (cutoff && Date.parse(String(data.created_at || '')) >= cutoff) return false
    return true
  })

  await deleteDocs(docs)
}

function normalizeMarathon(doc: QueryDocumentSnapshot<DocumentData>): MarathonRecord {
  const data = doc.data()
  return {
    id: doc.id,
    titulo: String(data.titulo || data.title || 'Prova Python'),
    duracao_minutos: Number(data.duracao_minutos || data.durationMinutes || 180),
    mostrar_detalhes_testes: Boolean(data.mostrar_detalhes_testes ?? data.showTestDetails ?? false),
    mensagem_boas_vindas: String(data.mensagem_boas_vindas || data.welcomeMessage || ''),
    active: Boolean(data.active),
  }
}

function normalizeQuestion(doc: QueryDocumentSnapshot<DocumentData>, testes: TesteCase[]): Questao {
  const data = doc.data()
  const id = Number(data.id ?? data.number ?? doc.id)
  const exemplo = data.exemplo || {}

  return {
    id,
    titulo: String(data.titulo || data.title || `Questão ${id}`),
    texto: String(data.texto || data.statement || ''),
    funcao_nome: String(data.funcao_nome || data.functionName || 'resolver'),
    funcao_assinatura: String(data.funcao_assinatura || data.functionSignature || 'def resolver(entrada):\n    pass'),
    impedimentos: Array.isArray(data.impedimentos) ? data.impedimentos : Array.isArray(data.impediments) ? data.impediments : [],
    tags: Array.isArray(data.tags) ? data.tags : [],
    exemplo: {
      chamada: String(exemplo.chamada || exemplo.input || ''),
      retorno_esperado: exemplo.retorno_esperado ?? exemplo.output ?? null,
    },
    gabarito: String(data.gabarito || ''),
    testes,
  }
}

function normalizeTest(doc: QueryDocumentSnapshot<DocumentData>) {
  const data = doc.data()
  return {
    entrada: data.entrada ?? data.input,
    esperado: data.esperado ?? data.expected,
    order: data.order ?? data.ordem ?? 0,
  }
}

function toPublicQuestion(questao: Questao): QuestaoPublica {
  const { testes: _testes, gabarito: _gabarito, ...publica } = questao
  return publica
}

async function fallbackQuestionDoc(marathonId: string, questaoId: number) {
  const doc = await questionsCollection(marathonId).doc(String(questaoId)).get()
  return doc.exists ? doc as QueryDocumentSnapshot<DocumentData> : null
}

function marathonCollection(marathonId: string, name: string) {
  return getAdminFirestore().collection('marathons').doc(marathonId).collection(name)
}

function questionsCollection(marathonId: string) {
  return marathonCollection(marathonId, 'questions')
}

function descByDate(field: string) {
  return (a: Record<string, any>, b: Record<string, any>) => (
    Date.parse(String(b[field] || '')) - Date.parse(String(a[field] || ''))
  )
}

async function deleteDocs(docs: QueryDocumentSnapshot<DocumentData>[]) {
  const db = getAdminFirestore()
  for (let index = 0; index < docs.length; index += 450) {
    const batch = db.batch()
    docs.slice(index, index + 450).forEach((doc) => batch.delete(doc.ref))
    await batch.commit()
  }
}

async function commitIfNeeded(batch: WriteBatch, count: number) {
  if (count > 0) await batch.commit()
}
