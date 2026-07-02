import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { STAGE_DEFS } from '../clickup/clickup.constants';
import {
  ORIGEM_LABEL,
  Origem,
  STAGE_SLA_DIAS,
  origemDoStatus,
} from '../config/parametros';
import { PrismaService } from '../prisma/prisma.service';
import { MetricsFilterDto } from './dto/filters.dto';
import { ATIVO_STATUSES, clientWhere, daysBetween } from './metrics.helpers';

const MARCO_NAME = new Map(STAGE_DEFS.map((s) => [s.id, `${s.code}. ${s.name}`]));
const DONE_STATUSES = ['finalizado', 'finalizada', 'entregue'];

@Injectable()
export class GargalosService {
  constructor(private readonly prisma: PrismaService) {}

  async get(filter: MetricsFilterDto) {
    const where = clientWhere({ ...filter, macro: undefined });
    // SLA editável no banco (seed = STAGE_SLA_DIAS via ensureStageDefs)
    const stageDefs = await this.prisma.stageDef.findMany({
      select: { id: true, slaDays: true },
    });
    const slaPorMarco = new Map(stageDefs.map((s) => [s.id, s.slaDays]));
    const clients = await this.prisma.client.findMany({
      where,
      include: { stages: true },
    });
    const ativos = clients.filter((c) => ATIVO_STATUSES.includes(c.status));
    const ativoIds = [...new Set(ativos.map((c) => c.id))];
    const ativoIdSet = new Set(ativoIds);

    // ── onboarding (marco 01) ──
    const emOnboarding = ativos.filter((c) => c.currentStage === 1);
    const onboardingNaoConcluido = ativos.filter((c) =>
      c.stages.some(
        (s) => s.stageDefId === 1 && s.totalTasks > 0 && s.doneTasks < s.totalTasks,
      ),
    ).length;

    // ── tasks reais (sem stubs: status null = task deletada/nunca enriquecida) ──
    const opTasks = await this.prisma.opTask.findMany({
      where: { status: { not: null }, clientId: { in: ativoIds } },
    });
    const abertas = opTasks.filter((t) => !t.done);

    const diasParado = (t: { statusChangedAt: Date | null; dateCreated: Date | null }) =>
      daysBetween(t.statusChangedAt ?? t.dateCreated ?? new Date());

    // ── agregações em memória ──
    const now = new Date();
    const porMarcoMap = new Map<number, { count: number; somaDias: number }>();
    const porEtapaMap = new Map<
      string,
      { etapa: string; marcoId: number | null; count: number; somaDias: number }
    >();
    const porOrigemMap = new Map<Origem, { count: number; somaDias: number }>();
    const atrasoMap = new Map<
      string,
      { etapa: string; clientes: Set<string>; tarefas: number; somaDias: number; maxDias: number }
    >();

    for (const t of abertas) {
      const d = diasParado(t);
      if (t.stageDefId != null) {
        const e = porMarcoMap.get(t.stageDefId) ?? { count: 0, somaDias: 0 };
        e.count += 1;
        e.somaDias += d;
        porMarcoMap.set(t.stageDefId, e);
      }
      if (t.etapa) {
        const key = `${t.stageDefId ?? 0}|${t.etapa}`;
        const e =
          porEtapaMap.get(key) ??
          { etapa: t.etapa, marcoId: t.stageDefId, count: 0, somaDias: 0 };
        e.count += 1;
        e.somaDias += d;
        porEtapaMap.set(key, e);

        // atraso = due date da tarefa vencida
        if (t.dueDate && t.dueDate < now && t.clientId) {
          const dias = daysBetween(t.dueDate);
          const a =
            atrasoMap.get(t.etapa) ??
            { etapa: t.etapa, clientes: new Set<string>(), tarefas: 0, somaDias: 0, maxDias: 0 };
          a.clientes.add(t.clientId);
          a.tarefas += 1;
          a.somaDias += dias;
          a.maxDias = Math.max(a.maxDias, dias);
          atrasoMap.set(t.etapa, a);
        }
      }
      const origem = origemDoStatus(t.status);
      const o = porOrigemMap.get(origem) ?? { count: 0, somaDias: 0 };
      o.count += 1;
      o.somaDias += d;
      porOrigemMap.set(origem, o);
    }

    const porMarco = [...porMarcoMap.entries()]
      .map(([id, v]) => {
        const sla = slaPorMarco.get(id) ?? STAGE_SLA_DIAS[id] ?? null;
        const media = Math.round(v.somaDias / v.count);
        return {
          marco: MARCO_NAME.get(id) ?? String(id),
          tarefasAbertas: v.count,
          tempoMedioParadoDias: media,
          slaDias: sla,
          excedenteMedioDias: sla != null ? media - sla : null,
        };
      })
      .sort((a, b) => b.tarefasAbertas - a.tarefasAbertas);

    const porEtapa = [...porEtapaMap.values()]
      .map((e) => ({
        etapa: e.etapa,
        marco: e.marcoId ? MARCO_NAME.get(e.marcoId) ?? null : null,
        abertas: e.count,
        tempoMedioParadoDias: Math.round(e.somaDias / e.count),
      }))
      .sort((a, b) => b.tempoMedioParadoDias - a.tempoMedioParadoDias);

    const etapaClientesEmAtraso = [...atrasoMap.values()]
      .map((a) => ({
        etapa: a.etapa,
        clientes: a.clientes.size,
        tarefas: a.tarefas,
      }))
      .sort((a, b) => b.clientes - a.clientes)
      .slice(0, 10);

    const etapaMaiorAtraso = [...atrasoMap.values()]
      .map((a) => ({
        etapa: a.etapa,
        diasAtrasoMedio: Math.round(a.somaDias / a.tarefas),
        diasAtrasoMax: a.maxDias,
        tarefas: a.tarefas,
      }))
      .sort((a, b) => b.diasAtrasoMedio - a.diasAtrasoMedio)
      .slice(0, 10);

    // ── histórico real (op_task_events) ──
    const [etapaQueMaisTrava, tempoPorLista] = await Promise.all([
      this.etapaQueMaisTrava(ativoIds),
      this.tempoPorLista(ativoIds),
    ]);

    // documento que mais atrasa o onboarding = etapas de Solicitação (marco 01)
    const documentoQueMaisAtrasa = etapaQueMaisTrava
      .filter((e) => e.etapa.toLowerCase().startsWith('solicitação'))
      .slice(0, 5);

    // ── clientes parados >30d por marco ──
    const parados30 = ativos.filter(
      (c) =>
        (c.lastEvolutionAt ?? c.dateCreated) &&
        daysBetween(c.lastEvolutionAt ?? c.dateCreated) > 30,
    );
    const paradosPorMarcoMap = new Map<number, number>();
    for (const c of parados30) {
      if (c.currentStage != null) {
        paradosPorMarcoMap.set(
          c.currentStage,
          (paradosPorMarcoMap.get(c.currentStage) ?? 0) + 1,
        );
      }
    }
    const clientesParadosPorMarco = [...paradosPorMarcoMap.entries()]
      .map(([id, count]) => ({
        marco: MARCO_NAME.get(id) ?? String(id),
        clientes: count,
      }))
      .sort((a, b) => b.clientes - a.clientes);

    const tempoParadoPorOrigem = (
      ['cliente', 'interno', 'orgao_cartorio'] as Origem[]
    ).map((origem) => {
      const v = porOrigemMap.get(origem) ?? { count: 0, somaDias: 0 };
      return {
        origem,
        label: ORIGEM_LABEL[origem],
        tarefas: v.count,
        tempoMedioDias: v.count ? Math.round(v.somaDias / v.count) : 0,
        tempoTotalDias: v.somaDias,
      };
    });

    const comDueDate = abertas.filter((t) => t.dueDate !== null).length;

    return {
      onboarding: {
        emOnboarding: emOnboarding.length,
        acima15: emOnboarding.filter((c) => daysBetween(c.dateCreated) > 15).length,
        acima30: emOnboarding.filter((c) => daysBetween(c.dateCreated) > 30).length,
        naoConcluido: onboardingNaoConcluido,
        documentoQueMaisAtrasa,
      },
      porMarco,
      porEtapa: porEtapa.slice(0, 15),
      etapaQueMaisTrava: etapaQueMaisTrava.slice(0, 10),
      etapaClientesEmAtraso,
      etapaMaiorAtraso,
      tempoPorLista,
      clientesParadosPorMarco,
      tempoParadoPorOrigem,
      avisos: {
        origem:
          'Classificação de status por origem e SLA por marco estão em parametrização PROVISÓRIA (aguardando confirmação da Catena).',
        atraso: `Atraso por etapa usa o due date das tarefas no ClickUp (${comDueDate}/${abertas.length} tarefas abertas têm due date); cobertura melhora com a tabela de SLA.`,
        tempo:
          '"Etapa que mais trava" e "tempo por lista" vêm do histórico real de mudanças (status e movimentação entre listas).',
      },
    };
  }

  /**
   * Tempo trabalhando por etapa: 1ª saída de "para fazer" → conclusão, via
   * histórico real. (Criação→done superestima: as tasks nascem juntas no template.)
   */
  private async etapaQueMaisTrava(ativoIds: string[]) {
    if (!ativoIds.length) return [];
    const rows = await this.prisma.$queryRaw<
      { etapa: string; concluidas: number; tempoMedioDias: number }[]
    >(Prisma.sql`
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
      SELECT ot.etapa AS etapa, count(*)::int AS concluidas,
             round(avg(extract(epoch FROM (done.d - f.s)) / 86400))::int AS "tempoMedioDias"
      FROM first_start f
      JOIN done ON done.t = f.t AND done.d >= f.s
      JOIN op_tasks ot ON ot."clickupId" = f.t
      WHERE ot.etapa IS NOT NULL AND ot."clientId" IN (${Prisma.join(ativoIds)})
      GROUP BY 1
      HAVING count(*) >= 3
      ORDER BY "tempoMedioDias" DESC
    `);
    return rows;
  }

  /** Tempo médio de permanência por list (movimentações reais entre lists). */
  private async tempoPorLista(ativoIds: string[]) {
    if (!ativoIds.length) return [];
    const rows = await this.prisma.$queryRaw<
      { lista: string; passagens: number; tempoMedioDias: number }[]
    >(Prisma.sql`
      WITH ev AS (
        SELECT ev."opTaskClickupId" AS t, ev."fromValue" AS list, ev."changedAt",
               LAG(ev."changedAt") OVER (
                 PARTITION BY ev."opTaskClickupId" ORDER BY ev."changedAt"
               ) AS prev_at
        FROM op_task_events ev
        JOIN op_tasks ot ON ot."clickupId" = ev."opTaskClickupId"
        WHERE ev.kind = 'list' AND ot."clientId" IN (${Prisma.join(ativoIds)})
      ), cre AS (
        SELECT "opTaskClickupId" AS t, min("changedAt") AS c
        FROM op_task_events WHERE kind = 'creation' GROUP BY 1
      )
      SELECT ev.list AS lista, count(*)::int AS passagens,
             round((avg(extract(epoch FROM (ev."changedAt" - COALESCE(ev.prev_at, cre.c))) / 86400))::numeric, 1)::float AS "tempoMedioDias"
      FROM ev
      LEFT JOIN cre ON cre.t = ev.t
      WHERE COALESCE(ev.prev_at, cre.c) IS NOT NULL AND ev.list IS NOT NULL
      GROUP BY 1
      HAVING count(*) >= 5
      ORDER BY "tempoMedioDias" DESC
    `);
    return rows.map((r) => ({ ...r, slaDias: null as number | null }));
  }
}
