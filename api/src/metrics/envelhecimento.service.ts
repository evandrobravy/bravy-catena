import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MetricsFilterDto } from './dto/filters.dto';
import {
  ageBucket,
  ATIVO_STATUSES,
  clientWhere,
  daysBetween,
} from './metrics.helpers';

const BUCKETS = ['0-60', '61-90', '91-120', '121-180', '181-360', '360+'];

@Injectable()
export class EnvelhecimentoService {
  constructor(private readonly prisma: PrismaService) {}

  async get(filter: MetricsFilterDto) {
    const where = clientWhere({ ...filter, macro: undefined });
    const clients = await this.prisma.client.findMany({ where });
    const ativos = clients.filter((c) => ATIVO_STATUSES.includes(c.status));

    const withAge = ativos.map((c) => ({
      modelo: c.modelo ?? '(sem modelo)',
      dias: daysBetween(c.dateCreated),
    }));

    // faixas gerais
    const faixas = BUCKETS.map((b) => ({
      faixa: b,
      clientes: withAge.filter((c) => ageBucket(c.dias) === b).length,
    }));

    // faixas por modelo
    const modelos = [...new Set(withAge.map((c) => c.modelo))];
    const porModelo = modelos.map((m) => ({
      modelo: m,
      faixas: BUCKETS.map((b) => ({
        faixa: b,
        clientes: withAge.filter(
          (c) => c.modelo === m && ageBucket(c.dias) === b,
        ).length,
      })),
      tempoMedioDias: media(
        withAge.filter((c) => c.modelo === m).map((c) => c.dias),
      ),
    }));

    return {
      faixas,
      porModelo,
      tempoMedioDias: media(withAge.map((c) => c.dias)),
    };
  }
}

function media(nums: number[]): number {
  if (!nums.length) return 0;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}
