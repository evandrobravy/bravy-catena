export interface LabelValue {
  label: string;
  value: number;
}

export interface ExecutivoData {
  totais: { ativos: number; concluidos: number; paralisados: number; total: number };
  porModelo: LabelValue[];
  tempoMedioDias: number;
  progressoMedio: number;
  emAtraso: number;
  avisos: { dueDate: string };
}

export interface JornadaEtapa {
  stageId: number;
  etapa: string;
  clientes: number;
  pct: number;
  porModelo: LabelValue[];
}
export interface JornadaData {
  porEtapa: JornadaEtapa[];
  finalizados: number;
  maiorConcentracao: { etapa: string; clientes: number } | null;
  semEvolucao: { dias: number; clientes: number }[];
  avisos: { semEvolucao: string };
}

export interface EnvelhecimentoData {
  faixas: { faixa: string; clientes: number }[];
  porModelo: {
    modelo: string;
    faixas: { faixa: string; clientes: number }[];
    tempoMedioDias: number;
  }[];
  tempoMedioDias: number;
}

export interface ProgressoData {
  faixas: { faixa: string; clientes: number }[];
  progressoMedioPorModelo: { modelo: string; progressoMedio: number }[];
}

export interface ComercialData {
  porSeminario: {
    seminario: string;
    leads: number;
    agendamentos: number;
    reunioes: number;
    sv: number;
    projetos: number;
    holdings: number;
    conversoes: {
      leadReuniao: number;
      reuniaoSV: number;
      svProjeto: number;
      projetoHolding: number;
      totalAteHolding: number;
    };
  }[];
  avisos: { dados: string };
}

export interface CloserData {
  porCloser: {
    closer: string;
    reunioes: number;
    fechamentos: number;
    taxaFechamento: number;
    sv: number;
    projetos: number;
    holdings: number;
    faturamento: number;
    ticketMedio: number;
  }[];
}

export interface ReunioesData {
  realizadas: number;
  comFechamento: number;
  percentualFechamento: number;
}

export interface GargalosData {
  onboarding: { acima15: number; acima30: number; emOnboarding: number };
  porEtapa: {
    etapa: string;
    tarefasAbertas: number;
    tempoMedioParadoDias: number;
    slaDias: number | null;
    excedenteMedioDias: number | null;
  }[];
  porTarefa: { tarefa: string; abertas: number; tempoMedioParadoDias: number }[];
  clientesParadosPorEtapa: { etapa: string; clientes: number }[];
  tempoParadoPorOrigem: {
    origem: string;
    label: string;
    tarefas: number;
    tempoMedioDias: number;
    tempoTotalDias: number;
  }[];
  avisos: { origem: string; tempo: string };
}

export interface ResponsaveisData {
  porResponsavel: {
    responsavel: string;
    total: number;
    abertas: number;
    concluidas: number;
    clientes: number;
    tempoMedioParadoDias: number;
    pctConcluidas: number;
  }[];
  semResponsavel: number;
  avisos: { dados: string };
}
