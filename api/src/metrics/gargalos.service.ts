import { Injectable } from '@nestjs/common';
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

const STAGE_NAME = new Map(STAGE_DEFS.map((s) => [s.id, `${s.code}. ${s.name}`]));

@Injectable()
export class GargalosService {
  constructor(private readonly prisma: PrismaService) {}

  async get(filter: MetricsFilterDto) {
    const where = clientWhere({ ...filter, macro: undefined });
    const clients = await this.prisma.client.findMany({ where });
    const ativos = clients.filter((c) => ATIVO_STATUSES.includes(c.status));
    const ativoIds = new Set(ativos.map((c) => c.id));

    // Onboarding aging (etapa 1 = Onboarding)
    const onboarding = ativos.filter((c) => c.currentStage === 1);
    const onboardingAcima15 = onboarding.filter(
      (c) => daysBetween(c.dateCreated) > 15,
    ).length;
    const onboardingAcima30 = onboarding.filter(
      (c) => daysBetween(c.dateCreated) > 30,
    ).length;

    // Op tasks em aberto (não concluídas) dos clientes ativos
    const opTasks = await this.prisma.opTask.findMany({
      where: { done: false, clientId: { in: [...ativoIds] } },
    });

    const diasParado = (t: { statusChangedAt: Date | null; dateUpdated: Date | null }) =>
      daysBetween(t.statusChangedAt ?? t.dateUpdated ?? new Date());

    // Ranking por etapa (marco)
    const porEtapaMap = new Map<number, { count: number; somaDias: number }>();
    // Ranking por tarefa/subetapa (nome normalizado da tarefa)
    const porTarefaMap = new Map<string, { count: number; somaDias: number }>();
    // Tempo parado por origem (cliente / interno / órgão-cartório)
    const porOrigemMap = new Map<Origem, { count: number; somaDias: number }>();

    for (const t of opTasks) {
      const d = diasParado(t);
      if (t.stageDefId != null) {
        const e = porEtapaMap.get(t.stageDefId) ?? { count: 0, somaDias: 0 };
        e.count += 1;
        e.somaDias += d;
        porEtapaMap.set(t.stageDefId, e);
      }
      const tarefa = t.etapa ?? t.listName ?? '(sem tarefa)';
      const l = porTarefaMap.get(tarefa) ?? { count: 0, somaDias: 0 };
      l.count += 1;
      l.somaDias += d;
      porTarefaMap.set(tarefa, l);

      const origem = origemDoStatus(t.status);
      const o = porOrigemMap.get(origem) ?? { count: 0, somaDias: 0 };
      o.count += 1;
      o.somaDias += d;
      porOrigemMap.set(origem, o);
    }

    const porEtapa = [...porEtapaMap.entries()]
      .map(([id, v]) => ({
        etapa: STAGE_NAME.get(id) ?? String(id),
        tarefasAbertas: v.count,
        tempoMedioParadoDias: Math.round(v.somaDias / v.count),
        slaDias: STAGE_SLA_DIAS[id] ?? null,
        excedenteMedioDias:
          STAGE_SLA_DIAS[id] != null
            ? Math.round(v.somaDias / v.count) - STAGE_SLA_DIAS[id]
            : null,
      }))
      .sort((a, b) => b.tarefasAbertas - a.tarefasAbertas);

    const porTarefa = [...porTarefaMap.entries()]
      .map(([tarefa, v]) => ({
        tarefa,
        abertas: v.count,
        tempoMedioParadoDias: Math.round(v.somaDias / v.count),
      }))
      .sort((a, b) => b.tempoMedioParadoDias - a.tempoMedioParadoDias);

    // Tempo parado por origem
    const tempoParadoPorOrigem = (['cliente', 'interno', 'orgao_cartorio'] as Origem[]).map(
      (origem) => {
        const v = porOrigemMap.get(origem) ?? { count: 0, somaDias: 0 };
        return {
          origem,
          label: ORIGEM_LABEL[origem],
          tarefas: v.count,
          tempoMedioDias: v.count ? Math.round(v.somaDias / v.count) : 0,
          tempoTotalDias: v.somaDias,
        };
      },
    );

    // Etapa com mais clientes parados (>30 dias sem evolução)
    const parados30 = ativos.filter(
      (c) => c.lastEvolutionAt && daysBetween(c.lastEvolutionAt) > 30,
    );
    const paradosPorEtapaMap = new Map<number, number>();
    for (const c of parados30) {
      if (c.currentStage != null) {
        paradosPorEtapaMap.set(
          c.currentStage,
          (paradosPorEtapaMap.get(c.currentStage) ?? 0) + 1,
        );
      }
    }
    const clientesParadosPorEtapa = [...paradosPorEtapaMap.entries()]
      .map(([id, count]) => ({ etapa: STAGE_NAME.get(id) ?? String(id), clientes: count }))
      .sort((a, b) => b.clientes - a.clientes);

    return {
      onboarding: { acima15: onboardingAcima15, acima30: onboardingAcima30, emOnboarding: onboarding.length },
      porEtapa,
      porTarefa: porTarefa.slice(0, 10),
      clientesParadosPorEtapa,
      tempoParadoPorOrigem,
      avisos: {
        origem:
          'Classificação de status por origem e SLA por etapa estão em parametrização PROVISÓRIA (aguardando confirmação da Catena).',
        tempo:
          'Tempo parado estimado pela última mudança de status da tarefa; precisão aumenta com o histórico acumulado.',
      },
    };
  }
}
