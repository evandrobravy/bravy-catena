import { Injectable } from '@nestjs/common';
import { STAGE_DEFS } from '../clickup/clickup.constants';
import { PrismaService } from '../prisma/prisma.service';
import { MetricsFilterDto } from './dto/filters.dto';
import { ATIVO_STATUSES, clientWhere, daysBetween } from './metrics.helpers';

const MARCO_NAME = new Map(STAGE_DEFS.map((s) => [s.id, `${s.code}. ${s.name}`]));

@Injectable()
export class JornadaService {
  constructor(private readonly prisma: PrismaService) {}

  async get(filter: MetricsFilterDto) {
    const where = clientWhere({ ...filter, macro: undefined });
    const clients = await this.prisma.client.findMany({
      where,
      include: { stages: true },
    });
    const ativos = clients.filter((c) => ATIVO_STATUSES.includes(c.status));
    const ativoIds = new Set(ativos.map((c) => c.id));
    const modeloPorCliente = new Map(
      ativos.map((c) => [c.id, c.modelo ?? '(sem modelo)']),
    );

    // ── visão macro: clientes por marco (01–08) ──
    const porMarco = STAGE_DEFS.map((s) => {
      const inStage = ativos.filter((c) => c.currentStage === s.id);
      return {
        marcoId: s.id,
        marco: `${s.code}. ${s.name}`,
        clientes: inStage.length,
        pct: ativos.length
          ? Math.round((inStage.length / ativos.length) * 1000) / 10
          : 0,
        porModelo: agrupar(inStage, (c) => c.modelo ?? '(sem modelo)'),
      };
    });
    // finalizados de verdade: tem etapa com tarefas E todas completas.
    // Sem nenhuma tarefa vinculada = projeto ainda não estruturado (separado).
    const temTarefas = (c: (typeof ativos)[number]) =>
      c.stages.some((s) => s.totalTasks > 0);
    const tudoCompleto = (c: (typeof ativos)[number]) =>
      c.stages.every((s) => s.totalTasks === 0 || s.doneTasks === s.totalTasks);
    const finalizados = ativos.filter(
      (c) => c.currentStage === null && temTarefas(c) && tudoCompleto(c),
    ).length;
    const semTarefasVinculadas = ativos.filter((c) => !temTarefas(c)).length;

    // ── etapa = tarefa vinculada: clientes com tarefa aberta por etapa ──
    const abertas = await this.prisma.opTask.findMany({
      where: {
        clientId: { not: null },
        status: { not: null },
        done: false,
        etapa: { not: null },
      },
      select: { clientId: true, etapa: true, stageDefId: true },
    });
    const porEtapaMap = new Map<
      string,
      { etapa: string; marcoId: number | null; clientes: Set<string> }
    >();
    for (const t of abertas) {
      if (!t.clientId || !ativoIds.has(t.clientId) || !t.etapa) continue;
      const key = `${t.stageDefId ?? 0}|${t.etapa}`;
      const entry =
        porEtapaMap.get(key) ??
        { etapa: t.etapa, marcoId: t.stageDefId, clientes: new Set<string>() };
      entry.clientes.add(t.clientId);
      porEtapaMap.set(key, entry);
    }
    const porEtapa = [...porEtapaMap.values()]
      .map((e) => ({
        etapa: e.etapa,
        marco: e.marcoId ? MARCO_NAME.get(e.marcoId) ?? null : null,
        clientes: e.clientes.size,
        porModelo: agrupar([...e.clientes], (id) =>
          modeloPorCliente.get(id) ?? '(sem modelo)',
        ),
      }))
      .sort((a, b) => b.clientes - a.clientes);

    const maiorConcentracao = porEtapa[0] ?? null;

    // ── sem evolução = nenhuma tarefa com mudança de status no período ──
    const buckets = [7, 15, 30, 60, 90];
    // fallback = dateCreated: cliente sem NENHUMA evolução registrada conta
    // como parado desde a entrada (dateUpdated mascararia — qualquer edição conta)
    const semEvolucao = buckets.map((d) => ({
      dias: d,
      clientes: ativos.filter(
        (c) => daysBetween(c.lastEvolutionAt ?? c.dateCreated) >= d,
      ).length,
    }));

    return {
      porMarco,
      porEtapa,
      finalizados,
      semTarefasVinculadas,
      maiorConcentracao,
      semEvolucao,
      avisos: {
        semEvolucao:
          'Evolução = mudança de status de tarefa do cliente (comentário não conta). Histórico anterior ao início da coleta é aproximado pela última atualização.',
      },
    };
  }
}

function agrupar<T>(items: T[], keyFn: (i: T) => string) {
  const map = new Map<string, number>();
  for (const item of items) {
    const k = keyFn(item);
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return [...map.entries()].map(([label, value]) => ({ label, value }));
}
