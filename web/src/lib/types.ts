export interface LabelValue {
  label: string;
  value: number;
}

export interface ExecutivoData {
  totais: { ativos: number; concluidos: number; paralisados: number; total: number };
  porModelo: LabelValue[];
  tempoMedioDias: number;
  tempoMedioConcluidosDias: number;
  tempoMedioPorModelo: { modelo: string; tempoMedioDias: number }[];
  progressoMedio: number;
  emAtraso: number;
  emAtrasoDetalhe: {
    comDueDateVencido: number;
    semDueDateAcimaMeta: number;
    clientesComDueDate: number;
  };
  metaTotalDias: number;
  avisos: { dueDate: string };
}

export interface JornadaMarco {
  marcoId: number;
  marco: string;
  clientes: number;
  pct: number;
  porModelo: LabelValue[];
}
export interface JornadaEtapa {
  etapa: string;
  marco: string | null;
  clientes: number;
  porModelo: LabelValue[];
}
export interface JornadaData {
  porMarco: JornadaMarco[];
  porEtapa: JornadaEtapa[];
  finalizados: number;
  semTarefasVinculadas: number;
  maiorConcentracao: JornadaEtapa | null;
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
  onboarding: {
    emOnboarding: number;
    acima15: number;
    acima30: number;
    naoConcluido: number;
    documentoQueMaisAtrasa: { etapa: string; concluidas: number; tempoMedioDias: number }[];
  };
  porMarco: {
    marco: string;
    tarefasAbertas: number;
    tempoMedioParadoDias: number;
    slaDias: number | null;
    excedenteMedioDias: number | null;
  }[];
  porEtapa: {
    etapa: string;
    marco: string | null;
    abertas: number;
    tempoMedioParadoDias: number;
  }[];
  etapaQueMaisTrava: { etapa: string; concluidas: number; tempoMedioDias: number }[];
  etapaClientesEmAtraso: { etapa: string; clientes: number; tarefas: number }[];
  etapaMaiorAtraso: {
    etapa: string;
    diasAtrasoMedio: number;
    diasAtrasoMax: number;
    tarefas: number;
  }[];
  tempoPorLista: {
    lista: string;
    passagens: number;
    tempoMedioDias: number;
    slaDias: number | null;
  }[];
  clientesParadosPorMarco: { marco: string; clientes: number }[];
  tempoParadoPorOrigem: {
    origem: string;
    label: string;
    tarefas: number;
    tempoMedioDias: number;
    tempoTotalDias: number;
  }[];
  avisos: { origem: string; atraso: string; tempo: string };
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
