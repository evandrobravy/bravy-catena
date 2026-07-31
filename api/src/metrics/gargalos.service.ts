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
import { daysBetween } from './metrics.helpers';
import {
  clientesAtivos,
  passagensPorLista,
  tasksConcluidasComDuracao,
  tasksDosClientes,
} from './populations';

const MARCO_NAME = new Map(STAGE_DEFS.map((s) => [s.id, `${s.code}. ${s.name}`]));

interface EtapaAgg {
  etapa: string;
  marcoId: number | null;
  count: number;
  somaDias: number;
}

@Injectable()
export class GargalosService {
  constructor(private readonly prisma: PrismaService) {}

  async get(filter: MetricsFilterDto) {
    // SLA editável no banco (seed = STAGE_SLA_DIAS via ensureStageDefs)
    const stageDefs = await this.prisma.stageDef.findMany({
      select: { id: true, slaDays: true },
    });
    const slaPorMarco = new Map(stageDefs.map((s) => [s.id, s.slaDays]));

    const ativos = await clientesAtivos(this.prisma, filter.modelo);
    const ativoIds = ativos.map((c) => c.id);

    // ── onboarding (marco 01) ──
    const emOnboarding = ativos.filter((c) => c.currentStage === 1);
    const onboardingNaoConcluido = ativos.filter((c) =>
      c.stages.some(
        (s) => s.stageDefId === 1 && s.totalTasks > 0 && s.doneTasks < s.totalTasks,
      ),
    ).length;

    // ── tasks reais dos clientes ativos ──
    const opTasks = await tasksDosClientes(this.prisma, ativoIds);
    const abertas = opTasks.filter((t) => !t.done);

    // ── agregações em memória ──
    const now = new Date();
    const porMarcoMap = new Map<number, { count: number; somaDias: number }>();
    const porEtapaMap = new Map<string, EtapaAgg>();
    const porOrigemMap = new Map<Origem, { count: number; somaDias: number }>();
    const atrasoMap = new Map<
      string,
      { etapa: string; clientes: Set<string>; tarefas: number; somaDias: number; maxDias: number }
    >();

    for (const t of abertas) {
      const d = t.diasParado;
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

    // ── histórico real: agregados calculados SOBRE os itens da população
    //    (mesma origem do drill — paridade por construção) ──
    const [concluidas, passagens] = await Promise.all([
      tasksConcluidasComDuracao(this.prisma, ativoIds),
      passagensPorLista(this.prisma, ativoIds),
    ]);

    const travaMap = new Map<string, { count: number; soma: number }>();
    for (const t of concluidas) {
      const v = travaMap.get(t.etapa) ?? { count: 0, soma: 0 };
      v.count += 1;
      v.soma += t.diasRaw;
      travaMap.set(t.etapa, v);
    }
    const etapaQueMaisTrava = [...travaMap.entries()]
      .filter(([, v]) => v.count >= 3)
      .map(([etapa, v]) => ({
        etapa,
        concluidas: v.count,
        tempoMedioDias: Math.round(v.soma / v.count),
      }))
      .sort((a, b) => b.tempoMedioDias - a.tempoMedioDias);

    const listaMap = new Map<string, { count: number; soma: number }>();
    for (const p of passagens) {
      const v = listaMap.get(p.lista) ?? { count: 0, soma: 0 };
      v.count += 1;
      v.soma += p.diasRaw;
      listaMap.set(p.lista, v);
    }
    const tempoPorLista = [...listaMap.entries()]
      .filter(([, v]) => v.count >= 5)
      .map(([lista, v]) => ({
        lista,
        passagens: v.count,
        tempoMedioDias: Math.round((v.soma / v.count) * 10) / 10,
        slaDias: null as number | null,
      }))
      .sort((a, b) => b.tempoMedioDias - a.tempoMedioDias);

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
}
