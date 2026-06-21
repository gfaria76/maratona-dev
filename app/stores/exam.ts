import type { CodigoArquivo, ConfigProva, QuestaoPublica, ResultadoCorrecao, StatusQuestao } from '#shared/types/exam'

export type AccessReason =
  | 'allowed'
  | 'ip_not_allowed'
  | 'blocked_ip'
  | 'same_user_new_ip'
  | 'same_ip_other_user'
  | 'unknown'

export type SecurityScore = 'normal' | 'attention' | 'critical'

interface AccessVerifyResponse {
  allowed: boolean
  reason: AccessReason
  ipAddress: string
  sessionId?: string
  securityScore?: SecurityScore
}

export const useExamStore = defineStore('exam', () => {
  const config = ref<ConfigProva | null>(null)
  const questoes = ref<QuestaoPublica[]>([])
  const questaoAtualIdx = ref(0)
  const codigos = ref<Record<number, string>>({})
  const arquivos = ref<Record<number, CodigoArquivo[]>>({})
  const resultados = ref<Record<number, ResultadoCorrecao>>({})
  const tempoRestante = ref(0)
  const provaIniciada = ref(false)
  const provaFinalizada = ref(false)
  const carregando = ref(false)
  const executando = ref(false)
  const outputExecucao = ref('')
  const erroExecucao = ref<string | undefined>(undefined)
  const accessAllowed = ref(false)
  const accessReason = ref<AccessReason>('unknown')
  const accessIp = ref('')
  const securitySessionId = ref<string | null>(null)
  const securityScore = ref<SecurityScore>('normal')
  const securityWarnings = ref(0)

  let timerInterval: ReturnType<typeof setInterval> | null = null

  const questaoAtual = computed(() => questoes.value[questaoAtualIdx.value] ?? null)

  const statusQuestoes = computed<Record<number, StatusQuestao>>(() => {
    const status: Record<number, StatusQuestao> = {}
    for (const q of questoes.value) {
      const r = resultados.value[q.id]
      if (!r) status[q.id] = 'pendente'
      else if (r.erro) status[q.id] = 'erro'
      else if (r.passou) status[q.id] = 'correta'
      else status[q.id] = 'incorreta'
    }
    return status
  })

  const tempoFormatado = computed(() => {
    const mins = Math.floor(tempoRestante.value / 60)
    const secs = tempoRestante.value % 60
    const hours = Math.floor(mins / 60)
    const remainMins = mins % 60
    return `${String(hours).padStart(2, '0')}:${String(remainMins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  })

  const tempoPercentual = computed(() => {
    if (!config.value) return 100
    return (tempoRestante.value / (config.value.duracao_minutos * 60)) * 100
  })

  const tempoCritico = computed(() => tempoRestante.value > 0 && tempoRestante.value <= 600)

  async function verificarAcesso() {
    const result = await $fetch<AccessVerifyResponse>('/api/access/verify', { method: 'POST' })
    accessAllowed.value = result.allowed
    accessReason.value = result.reason
    accessIp.value = result.ipAddress
    securitySessionId.value = result.sessionId || null
    securityScore.value = result.securityScore || 'normal'
    return result
  }

  async function carregarConfig() {
    config.value = await $fetch<ConfigProva>('/api/config')
    tempoRestante.value = (config.value?.duracao_minutos ?? 180) * 60
  }

  async function carregarQuestoes() {
    questoes.value = await $fetch<QuestaoPublica[]>('/api/questoes')
    for (const q of questoes.value) {
      const initialCode = codigos.value[q.id] ?? q.funcao_assinatura
      if (!codigos.value[q.id]) {
        codigos.value[q.id] = initialCode
      }
      if (!arquivos.value[q.id]) {
        arquivos.value[q.id] = [{ name: 'main.py', content: initialCode }]
      }
    }
  }

  function iniciarProva() {
    provaIniciada.value = true
    provaFinalizada.value = false
    iniciarTimer()
  }

  function selecionarQuestao(idx: number) {
    if (idx >= 0 && idx < questoes.value.length) {
      questaoAtualIdx.value = idx
    }
  }

  function atualizarCodigo(questaoId: number, codigo: string) {
    codigos.value = { ...codigos.value, [questaoId]: codigo }
    const atuais = arquivos.value[questaoId] ?? [{ name: 'main.py', content: codigo }]
    arquivos.value = {
      ...arquivos.value,
      [questaoId]: atuais.map((arquivo, index) => (
        index === 0 || arquivo.name === 'main.py'
          ? { ...arquivo, name: 'main.py', content: codigo }
          : arquivo
      )),
    }
  }

  function atualizarArquivos(questaoId: number, novosArquivos: CodigoArquivo[]) {
    const normalized = normalizeArquivos(novosArquivos)
    arquivos.value = { ...arquivos.value, [questaoId]: normalized }
    const main = normalized.find((arquivo) => arquivo.name === 'main.py') ?? normalized[0]
    codigos.value = { ...codigos.value, [questaoId]: main?.content ?? '' }
  }

  async function submeter(questaoId: number): Promise<ResultadoCorrecao | null> {
    const codigo = codigos.value[questaoId]
    if (!codigo) return null

    carregando.value = true
    try {
      const resultado = await $fetch<ResultadoCorrecao>('/api/submeter', {
        method: 'POST',
        body: {
          questaoId,
          codigo,
          arquivos: arquivos.value[questaoId] ?? [{ name: 'main.py', content: codigo }],
        },
      })
      resultados.value = { ...resultados.value, [questaoId]: resultado }
      return resultado
    } catch (e: any) {
      const erroResult: ResultadoCorrecao = {
        questaoId,
        acertos: 0,
        total: 0,
        passou: false,
        impedimentosViolados: [],
        detalhes: [],
        erro: e?.data?.message || 'Erro ao submeter. Tente novamente.',
      }
      resultados.value = { ...resultados.value, [questaoId]: erroResult }
      return erroResult
    } finally {
      carregando.value = false
    }
  }

  async function executar(codigo: string, inputs?: string, codigoArquivos: CodigoArquivo[] = [], codigoTeste?: string) {
    executando.value = true
    outputExecucao.value = ''
    erroExecucao.value = undefined

    try {
      const resultado = await $fetch<{ output: string; erro?: string }>('/api/executar', {
        method: 'POST',
        body: { codigo, codigoTeste, inputs, arquivos: codigoArquivos },
      })
      outputExecucao.value = resultado.output
      erroExecucao.value = resultado.erro
    } catch (e: any) {
      erroExecucao.value = e?.data?.message || 'Erro ao executar.'
    } finally {
      executando.value = false
    }
  }

  async function reportarEventoSeguranca(eventType: string, metadata: Record<string, unknown> = {}) {
    if (!securitySessionId.value) return

    try {
      const result = await $fetch<{ ok: boolean; severity: SecurityScore }>('/api/access/events', {
        method: 'POST',
        body: {
          sessionId: securitySessionId.value,
          eventType,
          metadata,
        },
      })
      securityScore.value = result.severity
      if (result.severity !== 'normal') {
        securityWarnings.value++
      }
    } catch (e) {
      console.warn('Falha ao registrar evento de segurança:', e)
    }
  }

  function iniciarTimer() {
    pararTimer()
    timerInterval = setInterval(() => {
      if (tempoRestante.value > 0) {
        tempoRestante.value--
      } else {
        finalizarProva()
      }
    }, 1000)
  }

  function pararTimer() {
    if (timerInterval) {
      clearInterval(timerInterval)
      timerInterval = null
    }
  }

  function finalizarProva() {
    pararTimer()
    provaFinalizada.value = true
  }

  function normalizeArquivos(novosArquivos: CodigoArquivo[]): CodigoArquivo[] {
    const seen = new Set<string>()
    const safeFiles = novosArquivos
      .map((arquivo) => ({
        name: normalizeFileName(arquivo.name),
        content: arquivo.content ?? '',
      }))
      .filter((arquivo) => {
        if (!arquivo.name || seen.has(arquivo.name)) return false
        seen.add(arquivo.name)
        return true
      })

    const mainIndex = safeFiles.findIndex((arquivo) => arquivo.name === 'main.py')
    if (mainIndex === -1) {
      return [{ name: 'main.py', content: safeFiles[0]?.content ?? '' }, ...safeFiles]
    }

    const [main] = safeFiles.splice(mainIndex, 1)
    return main ? [main, ...safeFiles] : safeFiles
  }

  function normalizeFileName(name: string) {
    const cleaned = name.trim().replace(/\\/g, '/').replace(/^\/*/, '').replace(/\.\./g, '')
    if (!cleaned) return ''
    return cleaned.endsWith('.py') ? cleaned : `${cleaned}.py`
  }

  return {
    config,
    questoes,
    questaoAtualIdx,
    questaoAtual,
    codigos,
    arquivos,
    resultados,
    statusQuestoes,
    tempoRestante,
    tempoFormatado,
    tempoPercentual,
    tempoCritico,
    provaIniciada,
    provaFinalizada,
    carregando,
    executando,
    outputExecucao,
    erroExecucao,
    accessAllowed,
    accessReason,
    accessIp,
    securitySessionId,
    securityScore,
    securityWarnings,
    verificarAcesso,
    carregarConfig,
    carregarQuestoes,
    iniciarProva,
    selecionarQuestao,
    atualizarCodigo,
    atualizarArquivos,
    submeter,
    executar,
    reportarEventoSeguranca,
    finalizarProva,
  }
})
