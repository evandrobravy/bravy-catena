import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MetricsFilterDto } from './dto/filters.dto';
import { ageBucket, daysBetween } from './metrics.helpers';
import { clientesAtivos } from './populations';

const BUCKETS = ['0-60', '61-90', '91-120', '121-180', '181-360', '360+'];

@Injectable()
export class EnvelhecimentoService {
  constructor(private readonly prisma: PrismaService) {}

  async get(filter: MetricsFilterDto) {
    const ativos = await clientesAtivos(this.prisma, filter.modelo);

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

    // a idade vem de dateCreated (criação da task no ClickUp). Se o ClickUp
    // deles é mais novo que a carteira, nenhuma holding alcança as faixas
    // longas — o painel precisa dizer isso em vez de parecer erro de cálculo.
    const idadeMaxima = withAge.reduce((max, c) => Math.max(max, c.dias), 0);
    const maisAntigo = ativos.reduce<Date | null>(
      (min, c) => (min === null || c.dateCreated < min ? c.dateCreated : min),
      null,
    );

    return {
      faixas,
      porModelo,
      tempoMedioDias: media(withAge.map((c) => c.dias)),
      baseDados: {
        clienteMaisAntigoEm: maisAntigo,
        idadeMaximaDias: idadeMaxima,
      },
      avisos: {
        origem:
          'A idade conta a partir da criação da holding no ClickUp, não da entrada real do cliente na Catena. Holdings migradas de antes do ClickUp aparecem mais novas do que são — para corrigir, seria preciso um campo "data de entrada" preenchido no ClickUp.',
      },
    };
  }
}

function media(nums: number[]): number {
  if (!nums.length) return 0;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}
