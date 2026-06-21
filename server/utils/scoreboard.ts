export interface ScoreQuestion {
  id: number
  titulo: string
}

export interface ScoreSubmission {
  id: string | number
  questao_id: number
  user_id?: string | null
  email?: string | null
  session_id?: string | null
  ip_address?: string | null
  acertos: number
  total_testes: number
  status?: string | null
  created_at?: string | null
}

export interface QuestionScore {
  questionId: number
  percent: number
  acertos: number
  total: number
  status: string
  submittedAt: string
}

export interface ScoreboardRow {
  userId: string
  email: string
  sessionId: string | null
  ipAddress: string | null
  totalCorrect: number
  averagePercent: number
  lastSubmissionAt: string | null
  tieBreakAt: string | null
  questions: Record<number, QuestionScore>
}

interface MutableRow extends ScoreboardRow {
  _submissionDates: string[]
}

export function buildScoreboard(submissions: ScoreSubmission[], questions: ScoreQuestion[]): ScoreboardRow[] {
  const questionIds = new Set(questions.map((question) => question.id))
  const rows = new Map<string, MutableRow>()

  for (const submission of submissions) {
    if (!questionIds.has(submission.questao_id)) continue

    const email = normalizeEmail(submission.email)
    const userId = String(submission.user_id || email)
    const key = userId || email
    if (!key) continue

    const row = rows.get(key) || createRow(userId, email)
    const submittedAt = submission.created_at || ''
    const percent = getPercent(submission.acertos, submission.total_testes)
    const current = row.questions[submission.questao_id]

    row.sessionId = row.sessionId || submission.session_id || null
    row.ipAddress = row.ipAddress || submission.ip_address || null
    if (submittedAt) row._submissionDates.push(submittedAt)

    if (!current || isBetterSubmission(percent, submittedAt, current)) {
      row.questions[submission.questao_id] = {
        questionId: submission.questao_id,
        percent,
        acertos: submission.acertos,
        total: submission.total_testes,
        status: String(submission.status || (percent === 100 ? 'correta' : 'incorreta')),
        submittedAt,
      }
    }

    rows.set(key, row)
  }

  return Array.from(rows.values())
    .map((row) => finalizeRow(row, questions))
    .sort(compareRows)
}

function createRow(userId: string, email: string): MutableRow {
  return {
    userId,
    email,
    sessionId: null,
    ipAddress: null,
    totalCorrect: 0,
    averagePercent: 0,
    lastSubmissionAt: null,
    tieBreakAt: null,
    questions: {},
    _submissionDates: [],
  }
}

function finalizeRow(row: MutableRow, questions: ScoreQuestion[]): ScoreboardRow {
  const scores = questions.map((question) => row.questions[question.id]?.percent || 0)
  const correctDates = questions
    .map((question) => row.questions[question.id])
    .filter((score): score is QuestionScore => Boolean(score && score.percent === 100 && score.submittedAt))
    .map((score) => score.submittedAt)

  row.totalCorrect = scores.filter((percent) => percent === 100).length
  row.averagePercent = scores.length
    ? Math.round(scores.reduce((sum, percent) => sum + percent, 0) / scores.length)
    : 0
  row.lastSubmissionAt = latestDate(row._submissionDates)
  row.tieBreakAt = row.totalCorrect > 0 ? latestDate(correctDates) : row.lastSubmissionAt

  const { _submissionDates: _ignored, ...cleanRow } = row
  return cleanRow
}

function compareRows(a: ScoreboardRow, b: ScoreboardRow) {
  if (b.totalCorrect !== a.totalCorrect) return b.totalCorrect - a.totalCorrect

  const aTie = a.tieBreakAt ? Date.parse(a.tieBreakAt) : Number.POSITIVE_INFINITY
  const bTie = b.tieBreakAt ? Date.parse(b.tieBreakAt) : Number.POSITIVE_INFINITY
  if (aTie !== bTie) return aTie - bTie

  return a.email.localeCompare(b.email)
}

function isBetterSubmission(percent: number, submittedAt: string, current: QuestionScore) {
  if (percent !== current.percent) return percent > current.percent
  if (!submittedAt) return false
  if (!current.submittedAt) return true
  return Date.parse(submittedAt) < Date.parse(current.submittedAt)
}

function getPercent(acertos: number, total: number) {
  if (!total) return 0
  return Math.round((acertos / total) * 100)
}

function latestDate(values: string[]) {
  if (!values.length) return null
  return values.reduce((latest, value) => (
    Date.parse(value) > Date.parse(latest) ? value : latest
  ))
}

function normalizeEmail(email?: string | null) {
  return String(email || '').trim().toLowerCase()
}
