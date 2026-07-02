import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MetricsFilterDto } from './dto/filters.dto';
import {
  ATIVO_STATUSES,
  clientWhere,
  progressoBucket,
} from './metrics.helpers';

const BUCKETS = ['<25', '26-50', '51-75', '>75'];

@Injectable()
export class ProgressoService {
  constructor(private readonly prisma: PrismaService) {}

  async get(filter: MetricsFilterDto) {
    const where = clientWhere({ ...filter, macro: undefined });
    const clients = await this.prisma.client.findMany({ where });
    const ativos = clients.filter((c) => ATIVO_STATUSES.includes(c.status));

    const faixas = BUCKETS.map((b) => ({
      faixa: b,
      clientes: ativos.filter((c) => progressoBucket(c.progresso) === b).length,
    }));

    const modelos = [...new Set(ativos.map((c) => c.modelo ?? '(sem modelo)'))];
    const progressoMedioPorModelo = modelos.map((m) => {
      const grp = ativos.filter((c) => (c.modelo ?? '(sem modelo)') === m);
      const progs = grp
        .map((c) => c.progresso)
        .filter((p): p is number => p !== null);
      return {
        modelo: m,
        progressoMedio: progs.length
          ? Math.round((progs.reduce((a, b) => a + b, 0) / progs.length) * 10) /
            10
          : 0,
      };
    });

    return { faixas, progressoMedioPorModelo };
  }
}
