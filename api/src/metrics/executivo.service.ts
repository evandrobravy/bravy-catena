import { Injectable } from '@nestjs/common';
import { META_TOTAL_DIAS } from '../config/parametros';
import { PrismaService } from '../prisma/prisma.service';
import { MetricsFilterDto } from './dto/filters.dto';
import {
  ATIVO_STATUSES,
  clientWhere,
  daysBetween,
  PARALISADO_STATUSES,
} from './metrics.helpers';

@Injectable()
export class ExecutivoService {
  constructor(private readonly prisma: PrismaService) {}

  async get(filter: MetricsFilterDto) {
    const base = clientWhere({ ...filter, macro: undefined });
    const clients = await this.prisma.client.findMany({ where: base });

    const ativos = clients.filter((c) => ATIVO_STATUSES.includes(c.status));
    const concluidos = clients.filter((c) => c.status === 'finalizado');
    const paralisados = clients.filter((c) =>
      PARALISADO_STATUSES.includes(c.status),
    );

    // por modelo (todos)
    const porModelo = agrupar(clients, (c) => c.modelo ?? '(sem modelo)');

    // tempo médio na carteira (dias) — clientes ativos
    const idades = ativos.map((c) => daysBetween(c.dateCreated));
    const tempoMedioDias = idades.length
      ? Math.round(idades.reduce((a, b) => a + b, 0) / idades.length)
      : 0;

    // progresso médio — clientes ativos
    const progs = ativos
      .map((c) => c.progresso)
      .filter((p): p is number => p !== null);
    const progressoMedio = progs.length
      ? Math.round((progs.reduce((a, b) => a + b, 0) / progs.length) * 10) / 10
      : 0;

    // em atraso: meta total de dias (SLA) excedida — reunião: holding em 4 meses
    const emAtraso = ativos.filter(
      (c) => daysBetween(c.dateCreated) > META_TOTAL_DIAS,
    ).length;

    return {
      totais: {
        ativos: ativos.length,
        concluidos: concluidos.length,
        paralisados: paralisados.length,
        total: clients.length,
      },
      porModelo,
      tempoMedioDias,
      progressoMedio,
      emAtraso,
      metaTotalDias: META_TOTAL_DIAS,
      avisos: {
        dueDate: `"Em atraso" = holdings ativas com mais de ${META_TOTAL_DIAS} dias na carteira (meta de entrega). SLA por etapa em parametrização provisória.`,
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
