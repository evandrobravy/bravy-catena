import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ATIVO_STATUSES, daysBetween } from './metrics.helpers';

/**
 * Camada de POPULAÇÕES — fonte única de verdade das bases de cada métrica.
 * Os services de agregado E o drill consomem as mesmas funções, garantindo
 * que o número do card e a lista do drill nunca divirjam.
 */

export const DONE_STATUSES = ['finalizado', 'finalizada', 'entregue'];

/** Converte o filtro de modelo (com sentinela '(sem modelo)') em where. */
export function modeloWhere(modelo?: string): Prisma.ClientWhereInput {
  if (!modelo) return {};
  if (modelo === '(sem modelo)') return { modelo: null };
  return { modelo };
}

export type ClientComStages = Prisma.ClientGetPayload<{
  include: { stages: true };
}>;

/** Todos os clients (com stages), opcionalmente filtrados por modelo. */
export async function clientes(
  prisma: PrismaService,
  modelo?: string,
): Promise<ClientComStages[]> {
  return prisma.client.findMany({
    where: modeloWhere(modelo),
    include: { stages: true },
  });
}

/** Clients ativos (aguardando iniciação | execução | em encerramento). */
export async function clientesAtivos(
  prisma: PrismaService,
  modelo?: string,
): Promise<ClientComStages[]> {
  const all = await clientes(prisma, modelo);
  return all.filter((c) => ATIVO_STATUSES.includes(c.status));
}

export type TaskComCliente = Prisma.OpTaskGetPayload<{
  include: { client: { select: { id: true; name: true; modelo: true } } };
}> & { diasParado: number };

/**
 * Tarefas operacionais reais (status != null, sem stubs) dos clientes dados,
 * com cliente e diasParado (última mudança de status real → hoje).
 */
export async function tasksDosClientes(
  prisma: PrismaService,
  clientIds: string[],
): Promise<TaskComCliente[]> {
  if (!clientIds.length) return [];
  const tasks = await prisma.opTask.findMany({
    where: { status: { not: null }, clientId: { in: clientIds } },
    include: { client: { select: { id: true, name: true, modelo: true } } },
  });
  return tasks.map((t) => ({
    ...t,
    diasParado: daysBetween(t.statusChangedAt ?? t.dateCreated ?? new Date()),
  }));
}

/** Base própria do painel Responsáveis: TODAS as op_tasks (sem filtro de ativo). */
export async function tasksComAssignee(prisma: PrismaService) {
  const tasks = await prisma.opTask.findMany({
    where: { assignee: { not: null } },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          modelo: true,
          lastEvolutionAt: true,
          dateCreated: true,
        },
      },
    },
  });
  return tasks.map((t) => ({
    ...t,
    diasParado: daysBetween(t.statusChangedAt ?? t.dateUpdated ?? new Date()),
  }));
}

export type LeadComEstagio = Prisma.LeadGetPayload<Record<string, never>> & {
  estagio: number; // 0 = nada; 1 = SV; 2 = Projeto; 3 = Holding
};

export const NIVEL: Record<string, number> = { SV: 1, Projeto: 2, Holding: 3 };

/**
 * Leads com o estágio máximo atingido no funil, combinando
 * Lead.produtoVendido com os Deals vinculados (leadClickupId).
 */
export async function leadsComEstagio(
  prisma: PrismaService,
  filtro: { seminario?: string; closer?: string } = {},
): Promise<LeadComEstagio[]> {
  const where: Prisma.LeadWhereInput = {};
  if (filtro.seminario) {
    where.seminario =
      filtro.seminario === '(sem seminário)' ? null : filtro.seminario;
  }
  if (filtro.closer) {
    where.closer = filtro.closer === '(sem closer)' ? null : filtro.closer;
  }
  const [leads, deals] = await Promise.all([
    prisma.lead.findMany({ where }),
    prisma.deal.findMany({
      where: { leadClickupId: { not: null } },
      select: { leadClickupId: true, tipo: true },
    }),
  ]);
  const dealNivel = new Map<string, number>();
  for (const d of deals) {
    const n = NIVEL[d.tipo] ?? 0;
    if (!d.leadClickupId || !n) continue;
    dealNivel.set(
      d.leadClickupId,
      Math.max(dealNivel.get(d.leadClickupId) ?? 0, n),
    );
  }
  return leads.map((l) => ({
    ...l,
    estagio: Math.max(
      l.produtoVendido ? NIVEL[l.produtoVendido] ?? 0 : 0,
      l.clickupId ? dealNivel.get(l.clickupId) ?? 0 : 0,
    ),
  }));
}

export interface TaskConcluidaComDuracao {
  clickupId: string;
  nome: string;
  etapa: string;
  cliente: string | null;
  lista: string | null;
  assignee: string | null;
  iniciou: Date;
  concluiu: Date;
  /** dias BRUTOS (float) — agregados usam este; exibição arredonda. */
  diasRaw: number;
}

/**
 * Tarefas concluídas com duração REAL de trabalho: 1ª saída de "para fazer"
 * até a 1ª chegada em status done, via histórico (op_task_events).
 */
export async function tasksConcluidasComDuracao(
  prisma: PrismaService,
  clientIds: string[],
  etapa?: string,
): Promise<TaskConcluidaComDuracao[]> {
  if (!clientIds.length) return [];
  const etapaFilter = etapa ? Prisma.sql`AND ot.etapa = ${etapa}` : Prisma.empty;
  return prisma.$queryRaw<TaskConcluidaComDuracao[]>(Prisma.sql`
    WITH first_start AS (
      SELECT "opTaskClickupId" AS t, min("changedAt") AS s
      FROM op_task_events
      WHERE kind = 'status' AND lower("fromValue") = 'para fazer'
      GROUP BY 1
    ), done AS (
      SELECT "opTaskClickupId" AS t, min("changedAt") AS d
      FROM op_task_events
      WHERE kind = 'status' AND lower("toValue") IN (${Prisma.join(DONE_STATUSES)})
      GROUP BY 1
    )
    SELECT ot."clickupId" AS "clickupId", ot.name AS nome, ot.etapa AS etapa,
           c.name AS cliente, ot."listName" AS lista, ot.assignee AS assignee,
           f.s AS iniciou, done.d AS concluiu,
           (extract(epoch FROM (done.d - f.s)) / 86400)::float AS "diasRaw"
    FROM first_start f
    JOIN done ON done.t = f.t AND done.d >= f.s
    JOIN op_tasks ot ON ot."clickupId" = f.t
    LEFT JOIN clients c ON c.id = ot."clientId"
    WHERE ot.etapa IS NOT NULL
      AND ot."clientId" IN (${Prisma.join(clientIds)})
      ${etapaFilter}
    ORDER BY "diasRaw" DESC, ot."clickupId"
  `);
}

export interface PassagemDeLista {
  clickupId: string;
  tarefa: string;
  cliente: string | null;
  lista: string;
  entrou: Date;
  saiu: Date;
  /** dias BRUTOS (float). */
  diasRaw: number;
}

/**
 * Passagens de tarefas por lista (evento kind='list'): permanência entre a
 * chegada (evento anterior ou criação) e a saída da lista.
 */
export async function passagensPorLista(
  prisma: PrismaService,
  clientIds: string[],
  lista?: string,
): Promise<PassagemDeLista[]> {
  if (!clientIds.length) return [];
  const listaFilter = lista ? Prisma.sql`AND ev.list = ${lista}` : Prisma.empty;
  return prisma.$queryRaw<PassagemDeLista[]>(Prisma.sql`
    WITH ev AS (
      SELECT ev."opTaskClickupId" AS t, ev."fromValue" AS list, ev."changedAt",
             LAG(ev."changedAt") OVER (
               PARTITION BY ev."opTaskClickupId" ORDER BY ev."changedAt"
             ) AS prev_at
      FROM op_task_events ev
      JOIN op_tasks ot ON ot."clickupId" = ev."opTaskClickupId"
      WHERE ev.kind = 'list' AND ot."clientId" IN (${Prisma.join(clientIds)})
    ), cre AS (
      SELECT "opTaskClickupId" AS t, min("changedAt") AS c
      FROM op_task_events WHERE kind = 'creation' GROUP BY 1
    )
    SELECT ot."clickupId" AS "clickupId", ot.name AS tarefa, c.name AS cliente,
           ev.list AS lista,
           COALESCE(ev.prev_at, cre.c) AS entrou, ev."changedAt" AS saiu,
           (extract(epoch FROM (ev."changedAt" - COALESCE(ev.prev_at, cre.c))) / 86400)::float AS "diasRaw"
    FROM ev
    LEFT JOIN cre ON cre.t = ev.t
    JOIN op_tasks ot ON ot."clickupId" = ev.t
    LEFT JOIN clients c ON c.id = ot."clientId"
    WHERE COALESCE(ev.prev_at, cre.c) IS NOT NULL AND ev.list IS NOT NULL
      ${listaFilter}
    ORDER BY "diasRaw" DESC, ot."clickupId"
  `);
}

/** Conclusão real por cliente = max(dateDone) das suas tasks. */
export async function conclusaoPorCliente(
  prisma: PrismaService,
): Promise<Map<string, Date>> {
  const rows = await prisma.opTask.groupBy({
    by: ['clientId'],
    where: { clientId: { not: null }, dateDone: { not: null } },
    _max: { dateDone: true },
  });
  const map = new Map<string, Date>();
  for (const r of rows) {
    if (r.clientId && r._max.dateDone) map.set(r.clientId, r._max.dateDone);
  }
  return map;
}
