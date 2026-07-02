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

    // por modelo — base = ativos (consistente com os demais painéis)
    const porModelo = agrupar(ativos, (c) => c.modelo ?? '(sem modelo)');

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

    // em atraso (doc): due date do projeto vencida; sem due date, fallback
    // pela meta de entrega (reunião: holding em 4 meses)
    const now = new Date();
    const comDueDateVencido = ativos.filter(
      (c) => c.dueDate !== null && c.dueDate < now,
    ).length;
    const semDueDateAcimaMeta = ativos.filter(
      (c) => c.dueDate === null && daysBetween(c.dateCreated) > META_TOTAL_DIAS,
    ).length;
    const emAtraso = comDueDateVencido + semDueDateAcimaMeta;
    const clientesComDueDate = ativos.filter((c) => c.dueDate !== null).length;

    // tempo médio dos concluídos (início → conclusão real via dateDone das tasks)
    const conclusoes = await this.prisma.opTask.groupBy({
      by: ['clientId'],
      where: { clientId: { not: null }, dateDone: { not: null } },
      _max: { dateDone: true },
    });
    const conclusaoPorCliente = new Map(
      conclusoes.map((r) => [r.clientId, r._max.dateDone]),
    );
    const duracoesConcluidos = concluidos
      .map((c) => {
        const fim = conclusaoPorCliente.get(c.id) ?? c.dateUpdated;
        return fim ? daysBetween(c.dateCreated, fim) : null;
      })
      .filter((d): d is number => d !== null && d >= 0);
    const tempoMedioConcluidosDias = duracoesConcluidos.length
      ? Math.round(
          duracoesConcluidos.reduce((a, b) => a + b, 0) / duracoesConcluidos.length,
        )
      : 0;

    // tempo médio na carteira por modelo (ativos)
    const modelos = [...new Set(ativos.map((c) => c.modelo ?? '(sem modelo)'))];
    const tempoMedioPorModelo = modelos.map((m) => {
      const grp = ativos.filter((c) => (c.modelo ?? '(sem modelo)') === m);
      const dias = grp.map((c) => daysBetween(c.dateCreated));
      return {
        modelo: m,
        tempoMedioDias: dias.length
          ? Math.round(dias.reduce((a, b) => a + b, 0) / dias.length)
          : 0,
      };
    });

    return {
      totais: {
        ativos: ativos.length,
        concluidos: concluidos.length,
        paralisados: paralisados.length,
        total: clients.length,
      },
      porModelo,
      tempoMedioDias,
      tempoMedioConcluidosDias,
      tempoMedioPorModelo,
      progressoMedio,
      emAtraso,
      emAtrasoDetalhe: {
        comDueDateVencido,
        semDueDateAcimaMeta,
        clientesComDueDate,
      },
      metaTotalDias: META_TOTAL_DIAS,
      avisos: {
        dueDate: `"Em atraso" = data de vencimento do projeto vencida (${clientesComDueDate}/${ativos.length} holdings têm due date no ClickUp); sem due date, aplica-se a meta de ${META_TOTAL_DIAS} dias na carteira.`,
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
