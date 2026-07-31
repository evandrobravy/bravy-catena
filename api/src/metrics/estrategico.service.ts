import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MetricsFilterDto } from './dto/filters.dto';
import { clientes } from './populations';

/**
 * Painel Estratégico — impacto patrimonial da carteira.
 *
 * Fonte: campos currency da list de Holdings no ClickUp
 * ("Patrimônio VLR Mercado" com fallback para "Patrimônio DIRPF").
 * Enquanto o time não preencher esses campos, os números vêm zerados e a
 * cobertura abaixo diz exatamente quantas holdings têm valor informado.
 */
@Injectable()
export class EstrategicoService {
  constructor(private readonly prisma: PrismaService) {}

  async get(filter: MetricsFilterDto) {
    const all = await clientes(this.prisma, filter.modelo);
    const concluidos = all.filter((c) => c.status === 'finalizado');

    const valor = (c: (typeof all)[number]) => {
      const v = c.patrimonioMercado ?? c.patrimonio;
      return v === null ? null : Number(v);
    };

    const comValor = all.filter((c) => valor(c) !== null);
    const concluidosComValor = concluidos.filter((c) => valor(c) !== null);

    const soma = (list: typeof all) =>
      list.reduce((acc, c) => acc + (valor(c) ?? 0), 0);

    const patrimonioProtegido = soma(concluidos);
    const patrimonioOrganizado = soma(all);

    // por modelo de holding
    const modelos = [...new Set(all.map((c) => c.modelo ?? '(sem modelo)'))];
    const porModelo = modelos
      .map((m) => {
        const doModelo = all.filter((c) => (c.modelo ?? '(sem modelo)') === m);
        const concluidosDoModelo = doModelo.filter(
          (c) => c.status === 'finalizado',
        );
        return {
          modelo: m,
          familias: doModelo.length,
          patrimonio: soma(doModelo),
          patrimonioProtegido: soma(concluidosDoModelo),
          comValor: doModelo.filter((c) => valor(c) !== null).length,
        };
      })
      .sort((a, b) => b.patrimonio - a.patrimonio);

    return {
      patrimonioProtegido,
      patrimonioOrganizado,
      familiasAtendidas: concluidos.length,
      familiasNaCarteira: all.length,
      patrimonioMedioPorFamilia: concluidosComValor.length
        ? Math.round(patrimonioProtegido / concluidosComValor.length)
        : 0,
      porModelo,
      cobertura: {
        holdings: all.length,
        comValorInformado: comValor.length,
        pct: all.length
          ? Math.round((comValor.length / all.length) * 1000) / 10
          : 0,
      },
      indisponiveis: [
        'Quantidade de herdeiros impactados',
        'Valor total dos imóveis estruturados',
      ],
      avisos: {
        dados:
          'Patrimônio = campo "Patrimônio VLR Mercado" da Holding no ClickUp (fallback: "Patrimônio DIRPF"). Os campos existem mas ainda não estão preenchidos — o painel liga sozinho conforme o time preencher.',
        indisponiveis:
          'Herdeiros impactados e valor dos imóveis estruturados não têm campo correspondente no ClickUp hoje; precisam ser criados antes de virarem indicador.',
      },
    };
  }
}
