import { ClickUpTask } from '../clickup.types';
import { cfNumber, cfUser, epochToDate } from './cf.util';

export interface MappedDeal {
  clickupId: string;
  tipo: 'SV' | 'Projeto';
  status: string;
  valor: number | null;
  atendimento: string | null;
  dateCreated: Date;
}

export function mapDeal(task: ClickUpTask, tipo: 'SV' | 'Projeto'): MappedDeal {
  const valorField = tipo === 'SV' ? 'Valor Sessão' : 'Valor Projeto';
  return {
    clickupId: task.id,
    tipo,
    status: task.status.status,
    valor: cfNumber(task, valorField),
    atendimento: cfUser(task, 'Atendimento'),
    dateCreated: epochToDate(task.date_created) ?? new Date(),
  };
}
