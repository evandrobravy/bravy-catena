import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MetricsFilterDto } from './dto/filters.dto';
import { daysBetween } from './metrics.helpers';

@Injectable()
export class ResponsaveisService {
  constructor(private readonly prisma: PrismaService) {}

  async get(_filter: MetricsFilterDto) {
    // responsável real = assignee das tarefas operacionais
    const opTasks = await this.prisma.opTask.findMany({
      where: { assignee: { not: null } },
    });

    const map = new Map<
      string,
      {
        total: number;
        abertas: number;
        concluidas: number;
        somaDiasParado: number;
        clientes: Set<string>;
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
        };
      r.total += 1;
      if (t.done) {
        r.concluidas += 1;
      } else {
        r.abertas += 1;
        r.somaDiasParado += daysBetween(
          t.statusChangedAt ?? t.dateUpdated ?? new Date(),
        );
      }
      if (t.clientId) r.clientes.add(t.clientId);
      map.set(key, r);
    }

    const porResponsavel = [...map.entries()]
      .map(([responsavel, r]) => ({
        responsavel,
        total: r.total,
        abertas: r.abertas,
        concluidas: r.concluidas,
        clientes: r.clientes.size,
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
      avisos: {
        dados:
          'Responsável = assignee das tarefas operacionais no ClickUp (preenchimento parcial); popula conforme o time atribui.',
      },
    };
  }
}
