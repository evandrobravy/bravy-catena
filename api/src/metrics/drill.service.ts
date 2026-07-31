import { Injectable, NotFoundException } from '@nestjs/common';
import { STAGE_DEFS } from '../clickup/clickup.constants';
import { META_TOTAL_DIAS, origemDoStatus } from '../config/parametros';
import { PrismaService } from '../prisma/prisma.service';
import { DrillQueryDto } from './dto/drill.dto';
import { ageBucket, daysBetween, progressoBucket } from './metrics.helpers';
import {
  ClientComStages,
  clientes,
  clientesAtivos,
  conclusaoPorCliente,
  LeadComEstagio,
  leadsComEstagio,
  NIVEL,
  passagensPorLista,
  TaskComCliente,
  tasksConcluidasComDuracao,
  tasksDosClientes,
} from './populations';
import { SEM_EVOLUCAO_DIAS } from './responsaveis.service';

const MARCO_NAME = new Map(STAGE_DEFS.map((s) => [s.id, `${s.code}. ${s.name}`]));

export type DrillTipo = 'client' | 'task' | 'lead' | 'passagem';

export interface DrillResult {
  key: string;
  tipo: DrillTipo;
  total: number;
  agregado?: { clientes?: number; media?: number; soma?: number };
  items: Record<string, unknown>[];
}

type Resolver = (f: DrillQueryDto) => Promise<Omit<DrillResult, 'key'>>;

@Injectable()
export class DrillService {
  constructor(private readonly prisma: PrismaService) {}

  async get(key: string, f: DrillQueryDto): Promise<DrillResult> {
    const resolver = this.resolvers[key];
    if (!resolver) throw new NotFoundException(`drill key desconhecida: ${key}`);
    const r = await resolver(f);
    const take = f.take ?? 100;
    const skip = f.skip ?? 0;
    return { key, ...r, items: r.items.slice(skip, skip + take) };
  }

  // ── helpers de item ──────────────────────────────────────────────────

  private clientItem(c: ClientComStages, dias: number, extra?: Record<string, unknown>) {
    return {
      clickupId: c.clickupId,
      nome: c.name,
      modelo: c.modelo,
      status: c.status,
      progresso: c.progresso,
      marcoAtual: c.currentStage ? MARCO_NAME.get(c.currentStage) ?? null : null,
      dueDate: c.dueDate,
      dias,
      ...extra,
    };
  }

  private taskItem(t: TaskComCliente, dias?: number) {
    return {
      clickupId: t.clickupId,
      nome: t.name,
      cliente: t.client?.name ?? null,
      etapa: t.etapa,
      marco: t.stageDefId ? MARCO_NAME.get(t.stageDefId) ?? null : null,
      lista: t.listName,
      status: t.status,
      assignee: t.assignee,
      dueDate: t.dueDate,
      dias: dias ?? t.diasParado,
    };
  }

  private leadItem(l: LeadComEstagio) {
    return {
      clickupId: l.clickupId,
      fonte: l.fonte,
      nome: l.name,
      status: l.status,
      seminario: l.seminario,
      closer: l.closer,
      produtoVendido: l.produtoVendido,
      valor: l.valor ? Number(l.valor) : null,
      agendamento: l.agendamento,
      realizada: l.realizada,
    };
  }

  private clientResult(
    items: ReturnType<DrillService['clientItem']>[],
    agregado?: DrillResult['agregado'],
  ): Omit<DrillResult, 'key'> {
    const sorted = [...items].sort(
      (a, b) => (b.dias as number) - (a.dias as number),
    );
    return { tipo: 'client', total: sorted.length, agregado, items: sorted };
  }

  private taskResult(
    items: ReturnType<DrillService['taskItem']>[],
    agregado?: DrillResult['agregado'],
  ): Omit<DrillResult, 'key'> {
    const sorted = [...items].sort(
      (a, b) => (b.dias as number) - (a.dias as number),
    );
    return { tipo: 'task', total: sorted.length, agregado, items: sorted };
  }

  private leadResult(
    leads: LeadComEstagio[],
    agregado?: DrillResult['agregado'],
  ): Omit<DrillResult, 'key'> {
    return {
      tipo: 'lead',
      total: leads.length,
      agregado,
      items: leads.map((l) => this.leadItem(l)),
    };
  }

  private media(nums: number[], casas = 0): number {
    if (!nums.length) return 0;
    const m = nums.reduce((a, b) => a + b, 0) / nums.length;
    const f = 10 ** casas;
    return Math.round(m * f) / f;
  }

  // ── populações-base com filtros comuns ───────────────────────────────

  private ativos(f: DrillQueryDto) {
    return clientesAtivos(this.prisma, f.modelo);
  }

  private async abertasDeAtivos(f: DrillQueryDto) {
    const ativos = await this.ativos(f);
    const tasks = await tasksDosClientes(this.prisma, ativos.map((c) => c.id));
    return { ativos, abertas: tasks.filter((t) => !t.done) };
  }

  private idade(c: ClientComStages) {
    return daysBetween(c.dateCreated);
  }

  private semEvolucaoDias(c: ClientComStages) {
    return daysBetween(c.lastEvolutionAt ?? c.dateCreated);
  }

  // ── registry ─────────────────────────────────────────────────────────

  private readonly resolvers: Record<string, Resolver> = {
    // ===== EXECUTIVO =====
    'executivo.ativos': async (f) => {
      const ativos = await this.ativos(f);
      return this.clientResult(ativos.map((c) => this.clientItem(c, this.idade(c))));
    },
    'executivo.concluidos': async (f) => {
      const all = await clientes(this.prisma, f.modelo);
      const concluidos = all.filter((c) => c.status === 'finalizado');
      const conclusao = await conclusaoPorCliente(this.prisma);
      return this.clientResult(
        concluidos.map((c) => {
          const fim = conclusao.get(c.id) ?? c.dateUpdated;
          return this.clientItem(c, Math.max(0, daysBetween(c.dateCreated, fim)));
        }),
      );
    },
    'executivo.paralisados': async (f) => {
      const all = await clientes(this.prisma, f.modelo);
      const paralisados = all.filter((c) => c.status === 'paralisado');
      return this.clientResult(
        paralisados.map((c) => this.clientItem(c, this.idade(c))),
      );
    },
    'executivo.total': async (f) => {
      const all = await clientes(this.prisma, f.modelo);
      return this.clientResult(all.map((c) => this.clientItem(c, this.idade(c))));
    },
    'executivo.em-atraso': async (f) => {
      const ativos = await this.ativos(f);
      const now = new Date();
      const items = [
        ...ativos
          .filter((c) => c.dueDate !== null && c.dueDate < now)
          .map((c) =>
            this.clientItem(c, daysBetween(c.dueDate as Date), {
              motivo: 'due_vencido',
            }),
          ),
        ...ativos
          .filter((c) => c.dueDate === null && this.idade(c) > META_TOTAL_DIAS)
          .map((c) => this.clientItem(c, this.idade(c), { motivo: 'acima_meta' })),
      ];
      return this.clientResult(items);
    },
    'executivo.tempo-medio': async (f) => {
      const ativos = await this.ativos(f);
      const items = ativos.map((c) => this.clientItem(c, this.idade(c)));
      return this.clientResult(items, {
        media: this.media(items.map((i) => i.dias as number)),
      });
    },
    'executivo.tempo-medio-concluidos': async (f) => {
      const all = await clientes(this.prisma, f.modelo);
      const concluidos = all.filter((c) => c.status === 'finalizado');
      const conclusao = await conclusaoPorCliente(this.prisma);
      const items = concluidos
        .map((c) => {
          const fim = conclusao.get(c.id) ?? c.dateUpdated;
          const dias = fim ? daysBetween(c.dateCreated, fim) : null;
          return dias !== null && dias >= 0 ? this.clientItem(c, dias) : null;
        })
        .filter((i): i is NonNullable<typeof i> => i !== null);
      return this.clientResult(items, {
        media: this.media(items.map((i) => i.dias as number)),
      });
    },
    'executivo.progresso-medio': async (f) => {
      const ativos = await this.ativos(f);
      const comProgresso = ativos.filter((c) => c.progresso !== null);
      return this.clientResult(
        comProgresso.map((c) => this.clientItem(c, this.idade(c))),
        { media: this.media(comProgresso.map((c) => c.progresso as number), 1) },
      );
    },
    'executivo.por-modelo': async (f) => {
      // fatia = f.modelo (sentinela '(sem modelo)' resolvida na população)
      const ativos = await this.ativos(f);
      return this.clientResult(ativos.map((c) => this.clientItem(c, this.idade(c))));
    },

    // ===== JORNADA =====
    'jornada.marco': async (f) => {
      const ativos = await this.ativos(f);
      const doMarco = ativos.filter((c) => c.currentStage === (f.marcoId ?? -1));
      return this.clientResult(
        doMarco.map((c) => this.clientItem(c, this.semEvolucaoDias(c))),
      );
    },
    'jornada.etapa': async (f) => {
      const { abertas } = await this.abertasDeAtivos(f);
      const marcoId = f.marcoId === 0 ? null : f.marcoId ?? null;
      const daEtapa = abertas.filter(
        (t) =>
          t.etapa === f.etapa &&
          (f.marcoId === undefined || t.stageDefId === marcoId),
      );
      const clientesDistintos = new Set(daEtapa.map((t) => t.clientId)).size;
      return this.taskResult(
        daEtapa.map((t) => this.taskItem(t)),
        { clientes: clientesDistintos },
      );
    },
    'jornada.finalizados': async (f) => {
      const ativos = await this.ativos(f);
      const temTarefas = (c: ClientComStages) =>
        c.stages.some((s) => s.totalTasks > 0);
      const tudoCompleto = (c: ClientComStages) =>
        c.stages.every((s) => s.totalTasks === 0 || s.doneTasks === s.totalTasks);
      const fin = ativos.filter(
        (c) => c.currentStage === null && temTarefas(c) && tudoCompleto(c),
      );
      return this.clientResult(fin.map((c) => this.clientItem(c, this.idade(c))));
    },
    'jornada.sem-tarefas': async (f) => {
      const ativos = await this.ativos(f);
      const sem = ativos.filter((c) => !c.stages.some((s) => s.totalTasks > 0));
      return this.clientResult(sem.map((c) => this.clientItem(c, this.idade(c))));
    },
    'jornada.sem-evolucao': async (f) => {
      const ativos = await this.ativos(f);
      const bucket = f.bucketDias ?? 30;
      const parados = ativos.filter((c) => this.semEvolucaoDias(c) >= bucket);
      return this.clientResult(
        parados.map((c) => this.clientItem(c, this.semEvolucaoDias(c))),
      );
    },

    // ===== ENVELHECIMENTO / PROGRESSO =====
    'envelhecimento.faixa': async (f) => {
      const ativos = await this.ativos(f);
      const daFaixa = ativos.filter((c) => ageBucket(this.idade(c)) === f.faixa);
      return this.clientResult(
        daFaixa.map((c) => this.clientItem(c, this.idade(c))),
      );
    },
    'progresso.faixa': async (f) => {
      const ativos = await this.ativos(f);
      const daFaixa = ativos.filter(
        (c) => progressoBucket(c.progresso) === f.faixa,
      );
      return this.clientResult(
        daFaixa.map((c) => this.clientItem(c, this.idade(c))),
      );
    },
    'progresso.modelo': async (f) => {
      const ativos = await this.ativos(f);
      const comProgresso = ativos.filter((c) => c.progresso !== null);
      return this.clientResult(
        ativos.map((c) => this.clientItem(c, this.idade(c))),
        { media: this.media(comProgresso.map((c) => c.progresso as number), 1) },
      );
    },

    // ===== COMERCIAL / CLOSER / REUNIÕES =====
    'comercial.leads': async (f) => {
      const leads = await this.leadsDe(f);
      return this.leadResult(leads);
    },
    'comercial.agendamentos': async (f) => {
      const leads = await this.leadsDe(f);
      return this.leadResult(leads.filter((l) => l.agendamento !== null));
    },
    'comercial.reunioes': async (f) => {
      const leads = await this.leadsDe(f);
      return this.leadResult(leads.filter((l) => l.realizada !== null));
    },
    'comercial.vendas': async (f) => {
      const leads = await this.leadsDe(f);
      return this.leadResult(leads.filter((l) => l.estagio >= 1));
    },
    'comercial.produto': async (f) => {
      const leads = await this.leadsDe(f);
      const nivel = f.produto ? NIVEL[f.produto] : 1;
      return this.leadResult(leads.filter((l) => l.estagio >= nivel));
    },
    'closer.reunioes': async (f) => {
      const leads = await this.leadsDe(f);
      return this.leadResult(leads.filter((l) => l.realizada !== null));
    },
    'closer.fechamentos': async (f) => {
      const leads = await this.leadsDe(f);
      return this.leadResult(leads.filter((l) => l.produtoVendido !== null));
    },
    'closer.faturamento': async (f) => {
      const leads = await this.leadsDe(f);
      const comValor = leads.filter((l) => l.valor && Number(l.valor) > 0);
      return this.leadResult(comValor, {
        soma: comValor.reduce((s, l) => s + Number(l.valor), 0),
      });
    },
    'closer.leads': async (f) => {
      const leads = await this.leadsDe(f);
      return this.leadResult(leads);
    },
    'reunioes.com-fechamento': async (f) => {
      const leads = await this.leadsDe(f);
      return this.leadResult(
        leads.filter((l) => l.realizada !== null && l.produtoVendido !== null),
      );
    },
    'reunioes.sem-fechamento': async (f) => {
      const leads = await this.leadsDe(f);
      return this.leadResult(
        leads.filter((l) => l.realizada !== null && l.produtoVendido === null),
      );
    },

    // ===== GARGALOS =====
    'gargalos.onboarding-acima': async (f) => {
      const ativos = await this.ativos(f);
      const bucket = f.bucketDias ?? 15;
      const grp = ativos.filter(
        (c) => c.currentStage === 1 && this.idade(c) > bucket,
      );
      return this.clientResult(grp.map((c) => this.clientItem(c, this.idade(c))));
    },
    'gargalos.onboarding-nao-concluido': async (f) => {
      const ativos = await this.ativos(f);
      const grp = ativos.filter((c) =>
        c.stages.some(
          (s) =>
            s.stageDefId === 1 && s.totalTasks > 0 && s.doneTasks < s.totalTasks,
        ),
      );
      return this.clientResult(grp.map((c) => this.clientItem(c, this.idade(c))));
    },
    'gargalos.marco': async (f) => {
      const { abertas } = await this.abertasDeAtivos(f);
      const doMarco = abertas.filter((t) => t.stageDefId === (f.marcoId ?? -1));
      return this.taskResult(doMarco.map((t) => this.taskItem(t)), {
        media: this.media(doMarco.map((t) => t.diasParado)),
      });
    },
    'gargalos.etapa-atraso': async (f) => {
      const { abertas } = await this.abertasDeAtivos(f);
      const now = new Date();
      const atrasadas = abertas.filter(
        (t) =>
          t.etapa === f.etapa &&
          t.dueDate !== null &&
          t.dueDate < now &&
          t.clientId !== null,
      );
      return this.taskResult(
        atrasadas.map((t) => this.taskItem(t, daysBetween(t.dueDate as Date))),
        {
          clientes: new Set(atrasadas.map((t) => t.clientId)).size,
          media: this.media(atrasadas.map((t) => daysBetween(t.dueDate as Date))),
        },
      );
    },
    'gargalos.origem': async (f) => {
      const { abertas } = await this.abertasDeAtivos(f);
      const daOrigem = abertas.filter(
        (t) => origemDoStatus(t.status) === (f.origem ?? 'interno'),
      );
      return this.taskResult(daOrigem.map((t) => this.taskItem(t)), {
        media: this.media(daOrigem.map((t) => t.diasParado)),
      });
    },
    'gargalos.etapa-trava': async (f) => {
      const ativos = await this.ativos(f);
      const concluidas = await tasksConcluidasComDuracao(
        this.prisma,
        ativos.map((c) => c.id),
        f.etapa,
      );
      const items = concluidas.map((t) => ({
        clickupId: t.clickupId,
        nome: t.nome,
        cliente: t.cliente,
        etapa: t.etapa,
        marco: null,
        lista: t.lista,
        status: 'finalizado',
        assignee: t.assignee,
        dueDate: null,
        iniciou: t.iniciou,
        concluiu: t.concluiu,
        dias: Math.round(t.diasRaw),
      }));
      return {
        tipo: 'task',
        total: items.length,
        agregado: { media: this.media(concluidas.map((t) => t.diasRaw)) },
        items,
      };
    },
    'gargalos.parados-marco': async (f) => {
      const ativos = await this.ativos(f);
      const grp = ativos.filter(
        (c) =>
          this.semEvolucaoDias(c) > 30 && c.currentStage === (f.marcoId ?? -1),
      );
      return this.clientResult(
        grp.map((c) => this.clientItem(c, this.semEvolucaoDias(c))),
      );
    },
    'gargalos.lista': async (f) => {
      const ativos = await this.ativos(f);
      const passagens = await passagensPorLista(
        this.prisma,
        ativos.map((c) => c.id),
        f.lista,
      );
      return {
        tipo: 'passagem',
        total: passagens.length,
        agregado: { media: this.media(passagens.map((p) => p.diasRaw), 1) },
        items: passagens.map((p) => ({
          clickupId: p.clickupId,
          tarefa: p.tarefa,
          cliente: p.cliente,
          lista: p.lista,
          entrou: p.entrou,
          saiu: p.saiu,
          dias: Math.round(p.diasRaw * 10) / 10,
        })),
      };
    },

    // ===== RESPONSÁVEIS =====
    'responsaveis.abertas': async (f) => {
      const tasks = await this.tasksDoResponsavel(f);
      const abertas = tasks.filter((t) => !t.done);
      return this.taskResult(abertas.map((t) => this.taskItem(t)), {
        media: this.media(abertas.map((t) => t.diasParado)),
      });
    },
    'responsaveis.concluidas': async (f) => {
      const tasks = await this.tasksDoResponsavel(f);
      return this.taskResult(
        tasks.filter((t) => t.done).map((t) => this.taskItem(t)),
      );
    },
    'responsaveis.tarefas': async (f) => {
      const tasks = await this.tasksDoResponsavel(f);
      return this.taskResult(tasks.map((t) => this.taskItem(t)));
    },
    'responsaveis.clientes-em-atraso': async (f) => {
      const clientIds = await this.clientesDoResponsavel(f, 'atraso');
      const all = await clientes(this.prisma, f.modelo);
      return this.clientResult(
        all
          .filter((c) => clientIds.has(c.id))
          .map((c) => this.clientItem(c, this.idade(c))),
      );
    },
    'responsaveis.sem-evolucao': async (f) => {
      const clientIds = await this.clientesDoResponsavel(f, 'sem-evolucao');
      const all = await clientes(this.prisma, f.modelo);
      return this.clientResult(
        all
          .filter((c) => clientIds.has(c.id))
          .map((c) => this.clientItem(c, this.semEvolucaoDias(c))),
      );
    },
    'responsaveis.sem-responsavel': async () => {
      // paridade com o card: sem filtro de status (inclui stubs)
      const tasks = await this.prisma.opTask.findMany({
        where: { assignee: null, done: false },
        include: { client: { select: { id: true, name: true, modelo: true } } },
      });
      const items = tasks.map((t) =>
        this.taskItem({
          ...t,
          diasParado: daysBetween(t.statusChangedAt ?? t.dateUpdated ?? new Date()),
        }),
      );
      return this.taskResult(items);
    },

    // ===== DRILL ANINHADO =====
    'cliente.tarefas': async (f) => {
      if (!f.clientId) return { tipo: 'task', total: 0, items: [] };
      const client = await this.prisma.client.findFirst({
        where: { OR: [{ id: f.clientId }, { clickupId: f.clientId }] },
        select: { id: true },
      });
      if (!client) return { tipo: 'task', total: 0, items: [] };
      const tasks = await tasksDosClientes(this.prisma, [client.id]);
      return this.taskResult(
        tasks.filter((t) => !t.done).map((t) => this.taskItem(t)),
      );
    },
  };

  // aliases — mesmo resolver, nomes por painel
  private aliasesInstalled = this.installAliases();
  private installAliases() {
    this.resolvers['envelhecimento.tempo-medio'] =
      this.resolvers['executivo.tempo-medio'];
    this.resolvers['reunioes.realizadas'] = this.resolvers['closer.reunioes'];
    this.resolvers['gargalos.etapa'] = this.resolvers['jornada.etapa'];
    // painel estratégico: famílias atendidas = holdings concluídas
    this.resolvers['estrategico.familias'] = this.resolvers['executivo.concluidos'];
    this.resolvers['estrategico.carteira'] = this.resolvers['executivo.total'];
    return true;
  }

  private leadsDe(f: DrillQueryDto) {
    return leadsComEstagio(this.prisma, {
      seminario: f.seminario,
      closer: f.closer,
    });
  }

  private async tasksDoResponsavel(f: DrillQueryDto) {
    const tasks = await this.prisma.opTask.findMany({
      where: {
        assignee: f.responsavel ? f.responsavel : { not: null },
      },
      include: { client: { select: { id: true, name: true, modelo: true } } },
    });
    // paridade com responsaveis.service: fallback dateUpdated
    return tasks.map((t) => ({
      ...t,
      diasParado: daysBetween(t.statusChangedAt ?? t.dateUpdated ?? new Date()),
    }));
  }

  /**
   * Clientes da carteira de um responsável que estão em atraso ou sem evolução.
   * Mesmos critérios do ResponsaveisService — paridade card ↔ drill.
   */
  private async clientesDoResponsavel(
    f: DrillQueryDto,
    criterio: 'atraso' | 'sem-evolucao',
  ): Promise<Set<string>> {
    const tasks = await this.prisma.opTask.findMany({
      where: {
        assignee: f.responsavel ? f.responsavel : { not: null },
        done: false,
        clientId: { not: null },
      },
      include: {
        client: { select: { id: true, lastEvolutionAt: true, dateCreated: true } },
      },
    });
    const now = new Date();
    const ids = new Set<string>();
    for (const t of tasks) {
      if (!t.clientId) continue;
      if (criterio === 'atraso') {
        if (t.dueDate !== null && t.dueDate < now) ids.add(t.clientId);
      } else {
        const ref = t.client?.lastEvolutionAt ?? t.client?.dateCreated ?? null;
        if (ref && daysBetween(ref) > SEM_EVOLUCAO_DIAS) ids.add(t.clientId);
      }
    }
    return ids;
  }
}
