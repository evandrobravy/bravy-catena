// Definições estáticas mapeadas do workspace ClickUp da Catena.

/** Marcos (etapas) da jornada — campos "tasks" na list Holdings. */
export const STAGE_DEFS: { id: number; code: string; name: string }[] = [
  { id: 1, code: '01', name: 'Onboarding' },
  { id: 2, code: '02', name: 'Célula Destino' },
  { id: 3, code: '03', name: 'Célula Cofre' },
  { id: 4, code: '04', name: 'ITBI & Registro' },
  { id: 5, code: '05', name: 'Célula Veículo' },
  { id: 6, code: '06', name: 'Acordo de Sócios' },
  { id: 7, code: '07', name: 'Entrega da Holding' },
  { id: 8, code: '08', name: 'Extras' },
];

/** Statuses de tarefa operacional que contam como concluída. */
export const OP_DONE_STATUSES = new Set(['finalizado', 'finalizada', 'entregue']);

/** Mapa status macro da Holding -> categoria do dashboard. */
export function macroStatus(status: string): 'ativo' | 'concluido' | 'paralisado' {
  const s = status.toLowerCase();
  if (s === 'finalizado') return 'concluido';
  if (s === 'paralisado') return 'paralisado';
  return 'ativo'; // aguardando iniciação | execução | em encerramento
}
