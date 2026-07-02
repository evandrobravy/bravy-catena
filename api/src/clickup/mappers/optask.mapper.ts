import { OP_DONE_STATUSES } from '../clickup.constants';
import { ClickUpTask } from '../clickup.types';
import { epochToDate } from './cf.util';
import { normalizeEtapa } from './etapa.util';

export interface MappedOpTask {
  clickupId: string;
  name: string;
  etapa: string;
  status: string | null;
  done: boolean;
  assignee: string | null;
  listId: string | null;
  listName: string | null;
  startDate: Date | null;
  dueDate: Date | null;
  dateDone: Date | null;
  dateCreated: Date | null;
  dateUpdated: Date | null;
}

export function mapOpTask(task: ClickUpTask): MappedOpTask {
  const status = task.status?.status ?? null;
  const assignee =
    task.assignees && task.assignees.length > 0
      ? task.assignees[0].username ?? task.assignees[0].email ?? null
      : null;
  return {
    clickupId: task.id,
    name: task.name,
    etapa: normalizeEtapa(task.name),
    status,
    done: status ? OP_DONE_STATUSES.has(status.toLowerCase()) : false,
    assignee,
    listId: task.list?.id ?? null,
    listName: task.list?.name ?? null,
    startDate: epochToDate(task.start_date),
    dueDate: epochToDate(task.due_date),
    dateDone: epochToDate(task.date_done ?? task.date_closed),
    dateCreated: epochToDate(task.date_created),
    dateUpdated: epochToDate(task.date_updated),
  };
}
