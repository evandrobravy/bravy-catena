import { ClickUpCustomField, ClickUpTask } from '../clickup.types';

/** Retorna o custom field pelo nome exato. */
export function cf(
  task: ClickUpTask,
  name: string,
): ClickUpCustomField | undefined {
  return task.custom_fields?.find((f) => f.name === name);
}

/** Valor cru de um custom field. */
export function cfValue(task: ClickUpTask, name: string): unknown {
  return cf(task, name)?.value;
}

/** Drop_down: resolve o índice/valor para o nome da opção. */
export function cfDropdown(task: ClickUpTask, name: string): string | null {
  const field = cf(task, name);
  if (!field || field.value === undefined || field.value === null) return null;
  const opts = field.type_config?.options ?? [];
  const v = field.value;
  if (typeof v === 'number' && v < opts.length) {
    return opts[v].name ?? opts[v].label ?? null;
  }
  // fallback: value pode ser id de opção
  const byId = opts.find((o) => o.id === v);
  return byId?.name ?? byId?.label ?? null;
}

/** Labels (multi): retorna nomes das opções selecionadas. */
export function cfLabels(task: ClickUpTask, name: string): string[] {
  const field = cf(task, name);
  if (!field || !Array.isArray(field.value)) return [];
  const opts = field.type_config?.options ?? [];
  return (field.value as unknown[])
    .map((v) => {
      const o = opts.find((op) => op.id === v);
      return o?.name ?? o?.label ?? String(v);
    })
    .filter(Boolean);
}

export function cfNumber(task: ClickUpTask, name: string): number | null {
  const v = cfValue(task, name);
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

/** Users field: primeiro username. */
export function cfUser(task: ClickUpTask, name: string): string | null {
  const v = cfValue(task, name);
  if (Array.isArray(v) && v.length > 0) {
    const u = v[0] as { username?: string; email?: string };
    return u.username ?? u.email ?? null;
  }
  return null;
}

/** automatic_progress -> percent_complete (0-100). */
export function cfProgress(task: ClickUpTask, name: string): number | null {
  const v = cfValue(task, name);
  if (v && typeof v === 'object' && 'percent_complete' in v) {
    return Number((v as { percent_complete: number }).percent_complete);
  }
  return null;
}

/** Converte epoch em ms (string|number) para Date. */
export function epochToDate(v: unknown): Date | null {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  if (Number.isNaN(n)) return null;
  return new Date(n);
}

/** Campo "tasks": lista de tarefas relacionadas com status embutido. */
export function cfLinkedTasks(
  task: ClickUpTask,
  name: string,
): { id: string; status: string | null }[] {
  const field = cf(task, name);
  if (!field || !Array.isArray(field.value)) return [];
  return (field.value as Array<{ id: string; status?: string | null }>).map(
    (t) => ({ id: t.id, status: t.status ?? null }),
  );
}
