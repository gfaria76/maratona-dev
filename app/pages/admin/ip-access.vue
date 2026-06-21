<template>
  <main class="arena-bg admin-page">
    <div class="arena-grid" />

    <section class="admin-shell">
      <header class="admin-header arena-card">
        <div class="title-block">
          <p class="arena-kicker">Painel professor</p>
          <h1>Controle de acesso</h1>
        </div>

        <div class="header-actions">
          <UButton
            icon="i-lucide-refresh-cw"
            color="neutral"
            variant="outline"
            label="Atualizar"
            :loading="loading"
            @click="() => loadData()"
          />
        </div>
      </header>

      <UAlert
        v-if="errorMessage"
        color="error"
        variant="soft"
        icon="i-lucide-triangle-alert"
        title="Painel indisponível"
        :description="errorMessage"
      />

      <section class="metric-strip">
        <div class="metric arena-card">
          <span>Faixas ativas</span>
          <strong>{{ activeRanges.length }}</strong>
        </div>
        <div class="metric arena-card">
          <span>Sessões ativas</span>
          <strong>{{ activeSessions.length }}</strong>
        </div>
        <div class="metric arena-card is-danger">
          <span>Bloqueios</span>
          <strong>{{ activeBlocks.length }}</strong>
        </div>
        <div class="metric arena-card is-warning">
          <span>Alertas</span>
          <strong>{{ actionableEvents.length }}</strong>
        </div>
      </section>

      <nav class="admin-tabs arena-card" aria-label="Áreas do painel">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          class="tab-button"
          :class="{ 'is-active': activeTab === tab.id }"
          @click="activeTab = tab.id"
        >
          <UIcon :name="tab.icon" />
          <span>{{ tab.label }}</span>
          <UBadge :color="tab.color" variant="soft">{{ tab.count }}</UBadge>
        </button>
      </nav>

      <section v-show="activeTab === 'ranges'" class="work-panel arena-card">
        <div class="panel-heading">
          <div>
            <h2>Faixas de IP</h2>
            <p>Cadastro de redes liberadas para iniciar a prova.</p>
          </div>
          <UButton
            v-if="editingRangeId"
            icon="i-lucide-x"
            color="neutral"
            variant="ghost"
            label="Cancelar edição"
            @click="resetRangeForm"
          />
        </div>

        <form class="range-form" @submit.prevent="saveRange">
          <label>
            <span>Nome</span>
            <input v-model.trim="rangeForm.label" placeholder="Laboratório 01" />
          </label>
          <label>
            <span>CIDR</span>
            <input v-model.trim="rangeForm.cidr" placeholder="192.168.10.0/24" />
          </label>
          <label class="switch-line">
            <input v-model="rangeForm.active" type="checkbox" />
            <span>Ativa</span>
          </label>
          <UButton
            type="submit"
            icon="i-lucide-save"
            :label="editingRangeId ? 'Salvar alterações' : 'Criar faixa'"
            :loading="savingRange"
          />
        </form>

        <div class="table-card">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>CIDR</th>
                <th>Status</th>
                <th>Criada por</th>
                <th class="actions-col">Ações</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="range in ranges" :key="range.id">
                <td>
                  <strong>{{ range.label }}</strong>
                </td>
                <td><code>{{ range.cidr }}</code></td>
                <td>
                  <UBadge :color="range.active ? 'success' : 'neutral'" variant="soft">
                    {{ range.active ? 'Ativa' : 'Inativa' }}
                  </UBadge>
                </td>
                <td>{{ range.created_by_email || '-' }}</td>
                <td class="row-actions">
                  <UButton
                    size="xs"
                    color="neutral"
                    variant="ghost"
                    icon="i-lucide-pencil"
                    aria-label="Editar faixa"
                    @click="editRange(range)"
                  />
                  <UButton
                    size="xs"
                    :color="range.active ? 'warning' : 'success'"
                    variant="ghost"
                    :icon="range.active ? 'i-lucide-pause' : 'i-lucide-play'"
                    :aria-label="range.active ? 'Desativar faixa' : 'Ativar faixa'"
                    @click="toggleRange(range)"
                  />
                  <UButton
                    size="xs"
                    color="error"
                    variant="ghost"
                    icon="i-lucide-trash-2"
                    aria-label="Excluir faixa"
                    @click="requestDeleteRange(range)"
                  />
                </td>
              </tr>
            </tbody>
          </table>
          <p v-if="!ranges.length" class="empty-copy">Nenhuma faixa cadastrada.</p>
        </div>
      </section>

      <section v-show="activeTab === 'sessions'" class="work-panel arena-card">
        <div class="panel-heading">
          <div>
            <h2>Sessões</h2>
            <p>Acompanhamento de alunos conectados e sessões bloqueadas.</p>
          </div>
          <input v-model.trim="sessionFilter" class="compact-filter" placeholder="Filtrar por email ou IP" />
        </div>

        <div class="table-card">
          <table>
            <thead>
              <tr>
                <th>Email</th>
                <th>IP</th>
                <th>Status</th>
                <th>Início</th>
                <th>Último sinal</th>
                <th class="actions-col">Ações</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="session in filteredSessions" :key="session.id">
                <td>{{ session.email }}</td>
                <td><code>{{ session.ip_address }}</code></td>
                <td>
                  <UBadge :color="sessionColor(session.status)" variant="soft">
                    {{ sessionLabel(session.status) }}
                  </UBadge>
                </td>
                <td>{{ formatDate(session.started_at) }}</td>
                <td>{{ formatDate(session.last_seen_at) }}</td>
                <td class="row-actions">
                  <UButton
                    v-if="session.status === 'blocked'"
                    size="xs"
                    color="success"
                    variant="ghost"
                    icon="i-lucide-unlock"
                    aria-label="Desbloquear sessão"
                    @click="requestUnblockSession(session.id)"
                  />
                  <UButton
                    v-if="session.status !== 'finished'"
                    size="xs"
                    color="warning"
                    variant="ghost"
                    icon="i-lucide-square"
                    aria-label="Encerrar sessão"
                    @click="requestFinishSession(session.id)"
                  />
                </td>
              </tr>
            </tbody>
          </table>
          <p v-if="!filteredSessions.length" class="empty-copy">Nenhuma sessão encontrada.</p>
        </div>
      </section>

      <section v-show="activeTab === 'blocks'" class="work-panel arena-card">
        <div class="panel-heading">
          <div>
            <h2>Bloqueios</h2>
            <p>IPs bloqueados automaticamente ou por intervenção manual.</p>
          </div>
          <label class="switch-line">
            <input v-model="showInactiveBlocks" type="checkbox" />
            <span>Mostrar liberados</span>
          </label>
        </div>

        <div class="block-grid">
          <article v-for="block in visibleBlocks" :key="block.id" class="block-card">
            <div>
              <UBadge :color="block.active ? 'error' : 'neutral'" variant="soft">
                {{ block.active ? 'Bloqueado' : 'Liberado' }}
              </UBadge>
              <h3>{{ block.ip_address }}</h3>
              <p>{{ block.reason }}</p>
            </div>
            <dl>
              <div>
                <dt>Bloqueado em</dt>
                <dd>{{ formatDate(block.blocked_at) }}</dd>
              </div>
              <div v-if="block.unblocked_at">
                <dt>Liberado em</dt>
                <dd>{{ formatDate(block.unblocked_at) }}</dd>
              </div>
            </dl>
            <UButton
              v-if="block.active"
              color="success"
              variant="soft"
              icon="i-lucide-unlock"
              label="Desbloquear IP"
              @click="requestUnblockIp(block.ip_address)"
            />
          </article>
        </div>
        <p v-if="!visibleBlocks.length" class="empty-copy">Nenhum bloqueio nesta visão.</p>
      </section>

      <section v-show="activeTab === 'scores'" class="work-panel arena-card">
        <div class="panel-heading">
          <div>
            <h2>Acompanhamento de acertos</h2>
            <p>Classificação por questões 100% corretas, com desempate pelo horário da submissão.</p>
          </div>
          <input v-model.trim="scoreFilter" class="compact-filter" placeholder="Filtrar por aluno ou IP" />
        </div>

        <div class="score-legend" aria-label="Legenda de acertos">
          <span><i class="legend-dot is-red" />0%</span>
          <span><i class="legend-dot is-yellow" />50%</span>
          <span><i class="legend-dot is-green" />100%</span>
        </div>

        <div class="table-card score-table-card">
          <table class="score-table">
            <thead>
              <tr>
                <th class="rank-col">#</th>
                <th>Aluno</th>
                <th v-for="question in questions" :key="question.id" class="score-question-col">
                  <span>Q{{ question.id }}</span>
                  <small>{{ question.titulo }}</small>
                </th>
                <th>Corretas</th>
                <th>Desempate</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, index) in filteredScoreboard" :key="row.userId || row.email">
                <td class="rank-cell">{{ index + 1 }}</td>
                <td class="student-cell">
                  <strong>{{ row.email || 'sem email' }}</strong>
                  <span>{{ row.ipAddress || 'sem IP' }}</span>
                </td>
                <td v-for="question in questions" :key="question.id" class="score-cell-wrap">
                  <div class="score-cell" :style="scoreCellStyle(row.questions[question.id]?.percent)">
                    <strong>{{ scoreText(row.questions[question.id]?.percent) }}</strong>
                    <span>{{ row.questions[question.id]?.acertos || 0 }}/{{ row.questions[question.id]?.total || '-' }}</span>
                  </div>
                </td>
                <td>
                  <strong>{{ row.totalCorrect }}/{{ questions.length }}</strong>
                </td>
                <td>{{ formatDate(row.tieBreakAt || row.lastSubmissionAt || undefined) }}</td>
              </tr>
            </tbody>
          </table>
          <p v-if="!filteredScoreboard.length" class="empty-copy">Nenhuma submissão registrada nesta visão.</p>
        </div>
      </section>

      <section v-show="activeTab === 'events'" class="work-panel arena-card">
        <div class="panel-heading">
          <div>
            <h2>Log de segurança</h2>
            <p>Eventos antifraude registrados durante a prova.</p>
          </div>
          <div class="log-actions">
            <select v-model="eventSeverityFilter">
              <option value="all">Todos</option>
              <option value="critical">Críticos</option>
              <option value="attention">Atenção</option>
              <option value="normal">Normais</option>
            </select>
            <UButton
              icon="i-lucide-eraser"
              color="warning"
              variant="soft"
              label="Limpar log"
              :loading="clearingEvents"
              @click="requestClearEvents"
            />
          </div>
        </div>

        <div class="event-list">
          <article v-for="event in filteredEvents" :key="event.id" class="event-row">
            <UBadge :color="eventColor(event.severity)" variant="soft">{{ eventLabel(event.severity) }}</UBadge>
            <div>
              <strong>{{ eventLabelType(event.event_type) }}</strong>
              <span>{{ event.email || 'sem email' }} · {{ event.ip_address || 'sem IP' }}</span>
            </div>
            <code>{{ formatMetadata(event.metadata) }}</code>
            <time>{{ formatDate(event.created_at) }}</time>
          </article>
          <p v-if="!filteredEvents.length" class="empty-copy">Nenhum evento nesta visão.</p>
        </div>
      </section>
    </section>

    <div v-if="pendingAction" class="dialog-backdrop" role="dialog" aria-modal="true">
      <section class="dialog-card arena-card">
        <div>
          <p class="arena-kicker">Confirmar ação</p>
          <h2>{{ pendingAction.title }}</h2>
          <p>{{ pendingAction.description }}</p>
        </div>

        <label v-if="pendingAction.needsReason">
          <span>Justificativa</span>
          <textarea
            v-model.trim="actionReason"
            class="reason-input"
            rows="4"
            placeholder="Registre o motivo desta ação..."
          />
        </label>

        <div class="dialog-actions">
          <UButton color="neutral" variant="ghost" label="Cancelar" @click="closeActionDialog" />
          <UButton
            :color="pendingAction.danger ? 'error' : 'primary'"
            :icon="pendingAction.danger ? 'i-lucide-trash-2' : 'i-lucide-check'"
            label="Confirmar"
            :loading="actionRunning"
            @click="confirmAction"
          />
        </div>
      </section>
    </div>
  </main>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
})

type AdminTab = 'ranges' | 'sessions' | 'blocks' | 'scores' | 'events'
type PendingAction =
  | { type: 'delete-range'; title: string; description: string; danger: true; needsReason: false; range: IpRange }
  | { type: 'unblock-ip'; title: string; description: string; danger: false; needsReason: true; ipAddress: string }
  | { type: 'unblock-session'; title: string; description: string; danger: false; needsReason: true; sessionId: string }
  | { type: 'finish-session'; title: string; description: string; danger: false; needsReason: true; sessionId: string }
  | { type: 'clear-events'; title: string; description: string; danger: true; needsReason: false }

interface IpRange {
  id: string
  label: string
  cidr: string
  active: boolean
  created_by_email?: string
}

interface SessionRow {
  id: string
  email: string
  ip_address: string
  status: 'active' | 'blocked' | 'finished'
  started_at?: string
  last_seen_at?: string
}

interface BlockRow {
  id: string
  ip_address: string
  active: boolean
  reason: string
  blocked_at?: string
  unblocked_at?: string
}

interface SecurityEvent {
  id: string
  email?: string
  ip_address?: string
  event_type: string
  severity: 'normal' | 'attention' | 'critical'
  metadata?: Record<string, unknown>
  created_at?: string
}

interface ScoreQuestion {
  id: number
  titulo: string
}

interface QuestionScore {
  questionId: number
  percent: number
  acertos: number
  total: number
  status: string
  submittedAt: string
}

interface ScoreboardRow {
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

const ranges = ref<IpRange[]>([])
const sessions = ref<SessionRow[]>([])
const blocks = ref<BlockRow[]>([])
const events = ref<SecurityEvent[]>([])
const questions = ref<ScoreQuestion[]>([])
const scoreboard = ref<ScoreboardRow[]>([])
const activeTab = ref<AdminTab>('ranges')
const errorMessage = ref('')
const loading = ref(false)
const savingRange = ref(false)
const clearingEvents = ref(false)
const actionRunning = ref(false)
const editingRangeId = ref<string | null>(null)
const pendingAction = ref<PendingAction | null>(null)
const actionReason = ref('')
const sessionFilter = ref('')
const scoreFilter = ref('')
const showInactiveBlocks = ref(false)
const eventSeverityFilter = ref<'all' | 'normal' | 'attention' | 'critical'>('all')
const rangeForm = reactive({ label: '', cidr: '', active: true })
let refreshInterval: ReturnType<typeof setInterval> | null = null
let dataRequestRunning = false

const activeRanges = computed(() => ranges.value.filter((range) => range.active))
const activeSessions = computed(() => sessions.value.filter((session) => session.status === 'active'))
const activeBlocks = computed(() => blocks.value.filter((block) => block.active))
const actionableEvents = computed(() => events.value.filter((event) => event.severity !== 'normal'))

const filteredSessions = computed(() => {
  const filter = sessionFilter.value.toLowerCase()
  if (!filter) return sessions.value
  return sessions.value.filter((session) => (
    session.email.toLowerCase().includes(filter) ||
    String(session.ip_address).includes(filter)
  ))
})

const visibleBlocks = computed(() => showInactiveBlocks.value ? blocks.value : activeBlocks.value)
const filteredEvents = computed(() => eventSeverityFilter.value === 'all'
  ? events.value
  : events.value.filter((event) => event.severity === eventSeverityFilter.value)
)
const filteredScoreboard = computed(() => {
  const filter = scoreFilter.value.toLowerCase()
  if (!filter) return scoreboard.value
  return scoreboard.value.filter((row) => (
    row.email.toLowerCase().includes(filter) ||
    String(row.ipAddress || '').includes(filter)
  ))
})

const tabs = computed(() => [
  { id: 'ranges' as const, label: 'Faixas', icon: 'i-lucide-radio-tower', color: 'primary' as const, count: ranges.value.length },
  { id: 'sessions' as const, label: 'Sessões', icon: 'i-lucide-users', color: 'success' as const, count: activeSessions.value.length },
  { id: 'blocks' as const, label: 'Bloqueios', icon: 'i-lucide-shield-ban', color: 'error' as const, count: activeBlocks.value.length },
  { id: 'scores' as const, label: 'Acertos', icon: 'i-lucide-trophy', color: 'primary' as const, count: scoreboard.value.length },
  { id: 'events' as const, label: 'Log', icon: 'i-lucide-list-filter', color: 'warning' as const, count: events.value.length },
])

onMounted(() => {
  loadData()
  refreshInterval = setInterval(() => {
    loadData({ silent: true })
  }, 1000)
})

onBeforeUnmount(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
    refreshInterval = null
  }
})

async function loadData(options: { silent?: boolean } = {}) {
  if (dataRequestRunning) return
  dataRequestRunning = true
  if (!options.silent) loading.value = true
  errorMessage.value = ''
  try {
    const data = await $fetch<{
      ranges: IpRange[]
      sessions: SessionRow[]
      blocks: BlockRow[]
      events: SecurityEvent[]
      questions: ScoreQuestion[]
      scoreboard: ScoreboardRow[]
    }>('/api/admin/ip-access')
    ranges.value = data.ranges
    sessions.value = data.sessions
    blocks.value = data.blocks
    events.value = data.events
    questions.value = data.questions
    scoreboard.value = data.scoreboard
  } catch (e: any) {
    errorMessage.value = e?.data?.message || 'Verifique se sua conta está autorizada como professor.'
  } finally {
    dataRequestRunning = false
    if (!options.silent) loading.value = false
  }
}

async function saveRange() {
  if (!rangeForm.label || !rangeForm.cidr) {
    errorMessage.value = 'Informe nome e faixa CIDR antes de salvar.'
    return
  }

  savingRange.value = true
  errorMessage.value = ''
  try {
    await $fetch('/api/admin/ip-ranges', {
      method: 'POST',
      body: {
        id: editingRangeId.value || undefined,
        label: rangeForm.label,
        cidr: rangeForm.cidr,
        active: rangeForm.active,
      },
    })
    resetRangeForm()
    await loadData()
  } catch (e: any) {
    errorMessage.value = e?.data?.message || 'Não foi possível salvar a faixa.'
  } finally {
    savingRange.value = false
  }
}

function editRange(range: IpRange) {
  editingRangeId.value = range.id
  rangeForm.label = range.label
  rangeForm.cidr = range.cidr
  rangeForm.active = range.active
}

function resetRangeForm() {
  editingRangeId.value = null
  rangeForm.label = ''
  rangeForm.cidr = ''
  rangeForm.active = true
}

async function toggleRange(range: IpRange) {
  await $fetch('/api/admin/ip-ranges', {
    method: 'POST',
    body: {
      id: range.id,
      label: range.label,
      cidr: range.cidr,
      active: !range.active,
    },
  })
  await loadData()
}

function requestDeleteRange(range: IpRange) {
  pendingAction.value = {
    type: 'delete-range',
    title: `Excluir ${range.label}`,
    description: `A faixa ${range.cidr} será removida do cadastro de redes permitidas.`,
    danger: true,
    needsReason: false,
    range,
  }
}

function requestUnblockIp(ipAddress: string) {
  actionReason.value = 'Liberado no painel do professor.'
  pendingAction.value = {
    type: 'unblock-ip',
    title: `Desbloquear ${ipAddress}`,
    description: 'O IP poderá voltar a acessar a prova se estiver em uma faixa ativa.',
    danger: false,
    needsReason: true,
    ipAddress,
  }
}

function requestUnblockSession(sessionId: string) {
  actionReason.value = 'Sessão reativada no painel do professor.'
  pendingAction.value = {
    type: 'unblock-session',
    title: 'Desbloquear sessão',
    description: 'A sessão marcada como bloqueada voltará ao estado ativo.',
    danger: false,
    needsReason: true,
    sessionId,
  }
}

function requestFinishSession(sessionId: string) {
  actionReason.value = 'Sessão encerrada pelo professor.'
  pendingAction.value = {
    type: 'finish-session',
    title: 'Encerrar sessão',
    description: 'A sessão será marcada como encerrada e sairá da lista de sessões ativas.',
    danger: false,
    needsReason: true,
    sessionId,
  }
}

function requestClearEvents() {
  pendingAction.value = {
    type: 'clear-events',
    title: 'Limpar log de segurança',
    description: eventSeverityFilter.value === 'all'
      ? 'Todos os eventos do log serão removidos. Um registro da limpeza será gravado.'
      : `Os eventos filtrados como ${eventLabel(eventSeverityFilter.value)} serão removidos. Um registro da limpeza será gravado.`,
    danger: true,
    needsReason: false,
  }
}

function closeActionDialog() {
  if (actionRunning.value) return
  pendingAction.value = null
  actionReason.value = ''
}

async function confirmAction() {
  if (!pendingAction.value) return
  if (pendingAction.value.needsReason && !actionReason.value) {
    errorMessage.value = 'Informe a justificativa antes de confirmar.'
    return
  }

  actionRunning.value = true
  errorMessage.value = ''
  try {
    const action = pendingAction.value
    if (action.type === 'delete-range') {
      await deleteRange(action.range)
    } else if (action.type === 'unblock-ip') {
      await unblockIp(action.ipAddress, actionReason.value)
    } else if (action.type === 'unblock-session') {
      await unblockSession(action.sessionId, actionReason.value)
    } else if (action.type === 'finish-session') {
      await finishSession(action.sessionId, actionReason.value)
    } else if (action.type === 'clear-events') {
      await clearEvents()
    }

    pendingAction.value = null
    actionReason.value = ''
  } catch (e: any) {
    errorMessage.value = e?.data?.message || 'A ação não pôde ser concluída.'
  } finally {
    actionRunning.value = false
  }
}

async function deleteRange(range: IpRange) {
  await $fetch(`/api/admin/ip-ranges/${range.id}`, { method: 'DELETE' })
  if (editingRangeId.value === range.id) resetRangeForm()
  await loadData()
}

async function unblockIp(ipAddress: string, reason: string) {
  await $fetch('/api/admin/ip-blocks/unblock', {
    method: 'POST',
    body: { ipAddress, reason },
  })
  await loadData()
}

async function unblockSession(sessionId: string, reason: string) {
  await $fetch('/api/admin/ip-blocks/unblock', {
    method: 'POST',
    body: { sessionId, reason },
  })
  await loadData()
}

async function finishSession(sessionId: string, reason: string) {
  await $fetch('/api/admin/sessions/finish', {
    method: 'POST',
    body: { sessionId, reason },
  })
  await loadData()
}

async function clearEvents() {
  clearingEvents.value = true
  try {
    await $fetch('/api/admin/security-events/clear', {
      method: 'POST',
      body: { severity: eventSeverityFilter.value },
    })
    await loadData()
  } finally {
    clearingEvents.value = false
  }
}

function formatDate(value?: string) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

function sessionColor(status: string) {
  if (status === 'active') return 'success'
  if (status === 'blocked') return 'error'
  return 'neutral'
}

function sessionLabel(status: string) {
  if (status === 'active') return 'Ativa'
  if (status === 'blocked') return 'Bloqueada'
  if (status === 'finished') return 'Encerrada'
  return status
}

function eventColor(severity: string) {
  if (severity === 'critical') return 'error'
  if (severity === 'attention') return 'warning'
  return 'neutral'
}

function eventLabel(severity: string) {
  if (severity === 'critical') return 'Crítico'
  if (severity === 'attention') return 'Atenção'
  return 'Normal'
}

function eventLabelType(type: string) {
  const labels: Record<string, string> = {
    blocked_ip: 'IP bloqueado',
    fullscreen_exit: 'Saiu da tela cheia',
    visibility_hidden: 'Aba oculta',
    window_blur: 'Janela sem foco',
    large_paste: 'Colagem grande',
    ip_conflict: 'Conflito de IP',
    manual_unblock: 'Desbloqueio manual',
    manual_finish_session: 'Sessão encerrada',
    clear_log: 'Log limpo',
    validation_failed: 'Validação bloqueada',
    submission_result: 'Submissão avaliada',
  }
  return labels[type] || type
}

function formatMetadata(metadata?: Record<string, unknown>) {
  if (!metadata || Object.keys(metadata).length === 0) return '-'
  return JSON.stringify(metadata)
}

function scoreText(percent?: number) {
  return `${Math.max(0, Math.min(100, percent || 0))}%`
}

function scoreCellStyle(percent?: number) {
  const value = Math.max(0, Math.min(100, percent || 0))
  const hue = Math.round((value / 100) * 120)
  return {
    background: `linear-gradient(135deg, hsla(${hue}, 84%, 42%, 0.36), hsla(${hue}, 90%, 50%, 0.14))`,
    borderColor: `hsla(${hue}, 90%, 55%, 0.42)`,
  }
}
</script>

<style scoped>
.admin-page {
  position: relative;
  height: 100dvh;
  overflow-y: auto;
  padding: 20px;
}

.admin-shell {
  position: relative;
  z-index: 1;
  display: flex;
  width: min(1440px, 100%);
  min-height: calc(100dvh - 40px);
  flex-direction: column;
  gap: 14px;
  margin: 0 auto;
  padding-bottom: 28px;
}

.admin-header {
  position: sticky;
  top: 12px;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border-radius: 8px;
  padding: 16px 18px;
}

.title-block h1 {
  margin-top: 2px;
  font-size: clamp(26px, 4vw, 42px);
  font-weight: 900;
  line-height: 1;
}

.header-actions,
.log-actions,
.row-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.metric-strip {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.metric {
  border-radius: 8px;
  padding: 14px;
}

.metric span {
  color: rgba(244, 247, 251, 0.58);
  font-family: "Roboto Mono", monospace;
  font-size: 11px;
  text-transform: uppercase;
}

.metric strong {
  display: block;
  margin-top: 4px;
  color: #33e28f;
  font-size: 30px;
  font-weight: 900;
}

.metric.is-danger strong {
  color: #ff4d8f;
}

.metric.is-warning strong {
  color: #ffb020;
}

.admin-tabs {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  border-radius: 8px;
  padding: 8px;
}

.tab-button {
  display: inline-flex;
  min-height: 38px;
  flex: 0 0 auto;
  align-items: center;
  gap: 8px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: rgba(244, 247, 251, 0.68);
  cursor: pointer;
  font-weight: 800;
  padding: 7px 10px;
}

.tab-button:hover,
.tab-button.is-active {
  border-color: rgba(25, 211, 255, 0.24);
  background: rgba(25, 211, 255, 0.1);
  color: #f4f7fb;
}

.work-panel {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  gap: 14px;
  border-radius: 8px;
  padding: 16px;
}

.panel-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.panel-heading h2 {
  font-size: 22px;
  font-weight: 900;
}

.panel-heading p,
.empty-copy {
  color: rgba(244, 247, 251, 0.58);
  font-size: 13px;
}

.range-form {
  display: grid;
  grid-template-columns: minmax(180px, 1fr) 190px auto auto;
  gap: 10px;
  align-items: end;
}

label {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 6px;
}

label span {
  color: rgba(25, 211, 255, 0.74);
  font-family: "Roboto Mono", monospace;
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
}

input,
select,
.reason-input {
  min-width: 0;
  border: 1px solid rgba(25, 211, 255, 0.22);
  border-radius: 8px;
  background: rgba(5, 8, 15, 0.82);
  color: #f4f7fb;
  padding: 0 11px;
  outline: none;
}

input,
select {
  height: 38px;
}

input:focus,
select:focus,
.reason-input:focus {
  border-color: rgba(25, 211, 255, 0.72);
  box-shadow: 0 0 0 3px rgba(25, 211, 255, 0.12);
}

.switch-line {
  min-height: 38px;
  flex-direction: row;
  align-items: center;
}

.switch-line input {
  width: 16px;
  height: 16px;
}

.compact-filter {
  width: min(320px, 100%);
}

.table-card,
.event-list,
.block-grid {
  min-height: 220px;
  overflow: auto;
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 8px;
  background: rgba(5, 8, 15, 0.34);
}

.table-card {
  max-height: calc(100dvh - 330px);
}

table {
  width: 100%;
  min-width: 820px;
  border-collapse: collapse;
  font-size: 13px;
}

thead {
  position: sticky;
  top: 0;
  z-index: 1;
  background: rgba(9, 13, 22, 0.96);
}

th,
td {
  border-bottom: 1px solid rgba(148, 163, 184, 0.12);
  padding: 10px;
  text-align: left;
  vertical-align: middle;
}

th {
  color: rgba(25, 211, 255, 0.72);
  font-family: "Roboto Mono", monospace;
  font-size: 11px;
  text-transform: uppercase;
}

td code,
.event-row code {
  color: #33e28f;
  font-family: "Roboto Mono", monospace;
  font-size: 12px;
}

.actions-col {
  width: 112px;
  text-align: right;
}

.row-actions {
  justify-content: flex-end;
}

.score-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.score-legend span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 8px;
  background: rgba(5, 8, 15, 0.42);
  color: rgba(244, 247, 251, 0.72);
  font-family: "Roboto Mono", monospace;
  font-size: 11px;
  font-weight: 800;
  padding: 6px 8px;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
}

.legend-dot.is-red {
  background: #dc2626;
}

.legend-dot.is-yellow {
  background: #facc15;
}

.legend-dot.is-green {
  background: #22c55e;
}

.score-table-card {
  max-height: calc(100dvh - 380px);
}

.score-table {
  min-width: 980px;
}

.rank-col {
  width: 54px;
}

.rank-cell {
  color: #19d3ff;
  font-family: "Roboto Mono", monospace;
  font-weight: 900;
}

.student-cell {
  min-width: 230px;
}

.student-cell strong,
.student-cell span,
.score-question-col span,
.score-question-col small {
  display: block;
}

.student-cell span {
  margin-top: 3px;
  color: rgba(244, 247, 251, 0.52);
  font-family: "Roboto Mono", monospace;
  font-size: 11px;
}

.score-question-col {
  width: 128px;
}

.score-question-col small {
  max-width: 112px;
  overflow: hidden;
  color: rgba(244, 247, 251, 0.48);
  font-family: "Roboto", sans-serif;
  font-size: 11px;
  font-weight: 600;
  text-overflow: ellipsis;
  text-transform: none;
  white-space: nowrap;
}

.score-cell-wrap {
  min-width: 112px;
}

.score-cell {
  display: flex;
  min-height: 48px;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
  border: 1px solid;
  border-radius: 8px;
  padding: 8px;
}

.score-cell strong {
  color: #f8fafc;
  font-family: "Roboto Mono", monospace;
  font-size: 17px;
  line-height: 1;
}

.score-cell span {
  color: rgba(244, 247, 251, 0.64);
  font-family: "Roboto Mono", monospace;
  font-size: 11px;
}

.block-grid {
  display: grid;
  max-height: calc(100dvh - 290px);
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 10px;
  padding: 10px;
}

.block-card {
  display: flex;
  min-height: 190px;
  flex-direction: column;
  justify-content: space-between;
  gap: 12px;
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 8px;
  background: rgba(16, 19, 29, 0.78);
  padding: 13px;
}

.block-card h3 {
  margin-top: 8px;
  font-family: "Roboto Mono", monospace;
  font-size: 20px;
  font-weight: 800;
}

.block-card p,
dd {
  color: rgba(244, 247, 251, 0.68);
  font-size: 13px;
}

dl {
  display: grid;
  gap: 6px;
  margin: 0;
}

dt {
  color: rgba(25, 211, 255, 0.64);
  font-family: "Roboto Mono", monospace;
  font-size: 10px;
  text-transform: uppercase;
}

dd {
  margin: 0;
}

.event-list {
  max-height: calc(100dvh - 290px);
  padding: 8px;
}

.event-row {
  display: grid;
  grid-template-columns: 96px minmax(220px, 1fr) minmax(220px, 1.3fr) 150px;
  gap: 12px;
  align-items: center;
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);
  padding: 10px 6px;
}

.event-row div {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.event-row span,
.event-row time {
  color: rgba(244, 247, 251, 0.58);
  font-size: 12px;
}

.event-row code {
  max-height: 44px;
  overflow: auto;
  color: rgba(244, 247, 251, 0.68);
  white-space: nowrap;
}

.dialog-backdrop {
  position: fixed;
  z-index: 20;
  display: grid;
  place-items: center;
  inset: 0;
  background: rgba(2, 6, 12, 0.72);
  padding: 18px;
}

.dialog-card {
  display: flex;
  width: min(520px, 100%);
  flex-direction: column;
  gap: 16px;
  border-radius: 8px;
  padding: 18px;
}

.dialog-card h2 {
  margin-top: 4px;
  font-size: 24px;
  font-weight: 900;
}

.dialog-card p {
  margin-top: 8px;
  color: rgba(244, 247, 251, 0.68);
  line-height: 1.5;
}

.reason-input {
  min-height: 110px;
  padding: 10px 11px;
  resize: vertical;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

@media (max-width: 980px) {
  .admin-page {
    padding: 12px;
  }

  .admin-shell {
    min-height: calc(100dvh - 24px);
  }

  .admin-header,
  .panel-heading {
    align-items: stretch;
    flex-direction: column;
  }

  .metric-strip {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .range-form {
    grid-template-columns: 1fr;
  }

  .table-card,
  .block-grid,
  .event-list,
  .score-table-card {
    max-height: none;
  }

  .event-row {
    grid-template-columns: 1fr;
  }

  .dialog-actions {
    flex-direction: column-reverse;
  }
}
</style>
