import { OP_DONE_STATUSES, STAGE_DEFS } from '../clickup.constants';
import { ClickUpTask } from '../clickup.types';
import {
  cfDropdown,
  cfLinkedTasks,
  cfNumber,
  cfProgress,
  epochToDate,
} from './cf.util';

export interface MappedStage {
  stageDefId: number;
  totalTasks: number;
  doneTasks: number;
  completedAt: Date | null;
  opTaskIds: string[];
}

export interface MappedClient {
  clickupId: string;
  name: string;
  status: string;
  modelo: string | null;
  progresso: number | null;
  contador: string | null;
  patrimonio: number | null;
  currentStage: number | null;
  dueDate: Date | null;
  dateCreated: Date;
  dateUpdated: Date;
  stages: MappedStage[];
}

export function mapHolding(task: ClickUpTask): MappedClient {
  const stages: MappedStage[] = STAGE_DEFS.map((def) => {
    // campo "tasks" nomeado "01. Onboarding", "02. Célula Destino", ...
    const fieldName = `${def.code}. ${def.name}`;
    const linked = cfLinkedTasks(task, fieldName);
    const total = linked.length;
    const done = linked.filter(
      (t) => t.status && OP_DONE_STATUSES.has(t.status.toLowerCase()),
    ).length;
    return {
      stageDefId: def.id,
      totalTasks: total,
      doneTasks: done,
      completedAt: total > 0 && done === total ? new Date() : null,
      opTaskIds: linked.map((t) => t.id),
    };
  });

  // etapa atual = primeiro marco com tarefas e ainda incompleto
  const current = stages.find((s) => s.totalTasks > 0 && s.doneTasks < s.totalTasks);
  const currentStage = current ? current.stageDefId : null;

  return {
    clickupId: task.id,
    name: task.name,
    status: task.status.status,
    modelo: cfDropdown(task, 'Modelo de Holding'),
    progresso: cfProgress(task, 'Progresso'),
    contador: cfDropdown(task, 'Contador'),
    patrimonio: cfNumber(task, 'Patrimônio DIRPF'),
    currentStage,
    dueDate: epochToDate(task.due_date),
    dateCreated: epochToDate(task.date_created) ?? new Date(),
    dateUpdated: epochToDate(task.date_updated) ?? new Date(),
    stages,
  };
}
