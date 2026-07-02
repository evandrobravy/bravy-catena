import { ClickUpTask } from '../clickup.types';
import {
  cfDropdown,
  cfLabels,
  cfNumber,
  cfUser,
  epochToDate,
} from './cf.util';

export interface MappedLead {
  clickupId: string;
  name: string;
  status: string;
  seminario: string | null;
  closer: string | null;
  produtoVendido: string | null;
  valor: number | null;
  agendamento: Date | null;
  realizada: Date | null;
  dateCreated: Date;
}

export function mapLead(task: ClickUpTask): MappedLead {
  const seminarios = cfLabels(task, 'Seminário de Origem');
  return {
    clickupId: task.id,
    name: task.name,
    status: task.status.status,
    seminario: seminarios[0] ?? null,
    closer: cfUser(task, 'Closer'),
    produtoVendido: cfDropdown(task, 'Produto Vendido'),
    valor: cfNumber(task, 'Valor'),
    agendamento: epochToDate(cfDateRaw(task, 'Agendamento')),
    realizada: epochToDate(cfDateRaw(task, 'Realizada')),
    dateCreated: epochToDate(task.date_created) ?? new Date(),
  };
}

function cfDateRaw(task: ClickUpTask, name: string): unknown {
  return task.custom_fields?.find((f) => f.name === name)?.value;
}
