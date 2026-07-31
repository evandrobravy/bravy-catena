import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MetricsFilterDto } from './dto/filters.dto';
import { daysBetween } from './metrics.helpers';
import { tasksComAssignee } from './populations';

/** Um cliente conta como "sem evolução" na carteira do responsável a partir daqui. */
export const SEM_EVOLUCAO_DIAS = 15;

@Injectable()
export class ResponsaveisService {
  constructor(private readonly prisma: PrismaService) {}

  async get(_filter: MetricsFilterDto) {
    // responsável real = assignee das tarefas operacionais
    const opTasks = await tasksComAssignee(this.prisma);
    const now = new Date();

    const map = new Map<
      string,
      {
        total: number;
        abertas: number;
        concluidas: number;
        somaDiasParado: number;
        clientes: Set<string>;
        clientesEmAtraso: Set<string>;
        clientesSemEvolucao: Set<string>;
      }
    >();

    for (const t of opTasks) {
      const key = t.assignee as string;
      const r =
        map.get(key) ??
        {
          total: 0,
          abertas: 0,
          concluidas: 0,
          somaDiasParado: 0,
          clientes: new Set<string>(),
          clientesEmAtraso: new Set<string>(),
          clientesSemEvolucao: new Set<string>(),
        };
      r.total += 1;
      if (t.done) {
        r.concluidas += 1;
      } else {
        r.abertas += 1;
        r.somaDiasParado += t.diasParado;
      }
      if (t.clientId) {
        r.clientes.add(t.clientId);
        // em atraso = tem tarefa aberta com due date vencido
        if (!t.done && t.dueDate !== null && t.dueDate < now) {
          r.clientesEmAtraso.add(t.clientId);
        }
        // sem evolução = nenhuma mudança de status no cliente há N dias
        const ref = t.client?.lastEvolutionAt ?? t.client?.dateCreated ?? null;
        if (!t.done && ref && daysBetween(ref) > SEM_EVOLUCAO_DIAS) {
          r.clientesSemEvolucao.add(t.clientId);
        }
      }
      map.set(key, r);
    }

    const porResponsavel = [...map.entries()]
      .map(([responsavel, r]) => ({
        responsavel,
        total: r.total,
        abertas: r.abertas,
        concluidas: r.concluidas,
        clientes: r.clientes.size,
        clientesEmAtraso: r.clientesEmAtraso.size,
        clientesSemEvolucao: r.clientesSemEvolucao.size,
        pctNoPrazo: r.clientes.size
          ? Math.round(
              ((r.clientes.size - r.clientesEmAtraso.size) / r.clientes.size) *
                1000,
            ) / 10
          : 0,
        tempoMedioParadoDias: r.abertas
          ? Math.round(r.somaDiasParado / r.abertas)
          : 0,
        pctConcluidas: r.total
          ? Math.round((r.concluidas / r.total) * 1000) / 10
          : 0,
      }))
      .sort((a, b) => b.total - a.total);

    const semResponsavel = await this.prisma.opTask.count({
      where: { assignee: null, done: false },
    });

    return {
      porResponsavel,
      semResponsavel,
      semEvolucaoDias: SEM_EVOLUCAO_DIAS,
      avisos: {
        dados:
          'Responsável = assignee das tarefas operacionais no ClickUp (preenchimento parcial); popula conforme o time atribui.',
        atraso: `Cliente em atraso = tem tarefa aberta com due date vencido. Sem evolução = nenhuma mudança de status há mais de ${SEM_EVOLUCAO_DIAS} dias.`,
      },
    };
  }
}
