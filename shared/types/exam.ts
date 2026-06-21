export interface TesteCase {
  entrada: unknown;
  esperado: unknown;
}

export interface CodigoArquivo {
  name: string;
  content: string;
}

export interface Questao {
  id: number;
  titulo: string;
  texto: string;
  funcao_nome: string;
  funcao_assinatura: string;
  codigo_teste: string;
  stdin: string;
  impedimentos: string[];
  tags: string[];
  exemplo: {
    chamada: string;
    retorno_esperado: unknown;
  };
  gabarito: string;
  testes: TesteCase[];
}

/** Dados públicos da questão (sem testes e gabarito) enviados ao cliente */
export interface QuestaoPublica {
  id: number;
  titulo: string;
  texto: string;
  funcao_nome: string;
  funcao_assinatura: string;
  codigo_teste: string;
  stdin: string;
  impedimentos: string[];
  tags: string[];
  exemplo: {
    chamada: string;
    retorno_esperado: unknown;
  };
}

export interface ResultadoTeste {
  indice: number;
  passou: boolean;
  entrada?: unknown;
  esperado?: unknown;
  obtido?: string;
  saida?: string;
  erro?: boolean;
}

export interface ResultadoCorrecao {
  questaoId: number;
  acertos: number;
  total: number;
  passou: boolean;
  impedimentosViolados: string[];
  detalhes: ResultadoTeste[];
  erro?: string;
}

export interface ConfigProva {
  titulo: string;
  duracao_minutos: number;
  mostrar_detalhes_testes: boolean;
  mensagem_boas_vindas: string;
}

export type StatusQuestao = "pendente" | "correta" | "incorreta" | "erro";
