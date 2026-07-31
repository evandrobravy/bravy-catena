import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MetricsFilterDto } from './dto/filters.dto';
import { leadsComEstagio } from './populations';

@Injectable()
export class ComercialService {
  constructor(private readonly prisma: PrismaService) {}

  private leads(filter: MetricsFilterDto) {
    return leadsComEstagio(this.prisma, {
      seminario: filter.seminario,
      closer: filter.closer,
    });
  }

  /** Dashboard Comercial por Seminário. */
  async seminario(filter: MetricsFilterDto) {
    const leads = await this.leads(filter);
    const seminarios = [
      ...new Set(leads.map((l) => l.seminario ?? '(sem seminário)')),
    ];

    const porSeminario = seminarios.map((s) => {
      const grp = leads.filter((l) => (l.seminario ?? '(sem seminário)') === s);
      const agendamentos = grp.filter((l) => l.agendamento !== null).length;
      const reunioes = grp.filter((l) => l.realizada !== null).length;
      // funil cumulativo: quem chegou PELO MENOS até o estágio
      const atingiuSV = grp.filter((l) => l.estagio >= 1);
      const atingiuProjeto = grp.filter((l) => l.estagio >= 2);
      const atingiuHolding = grp.filter((l) => l.estagio >= 3);
      return {
        seminario: s,
        leads: grp.length,
        agendamentos,
        reunioes,
        sv: atingiuSV.length,
        projetos: atingiuProjeto.length,
        holdings: atingiuHolding.length,
        conversoes: {
          leadReuniao: pct(reunioes, grp.length),
          reuniaoSV: pct(Math.min(atingiuSV.length, reunioes), reunioes),
          svProjeto: pct(atingiuProjeto.length, atingiuSV.length),
          projetoHolding: pct(atingiuHolding.length, atingiuProjeto.length),
          totalAteHolding: pct(atingiuHolding.length, grp.length),
        },
      };
    });

    return {
      porSeminario,
      avisos: {
        dados:
          'Funil cumulativo (quem chegou pelo menos até o estágio), combinando "Produto Vendido" do lead com os deals de SV/Projeto vinculados. "Seminário de Origem" pouco preenchido no ClickUp; popula conforme o comercial preenche. 2º estágio (carrinho abandonado/diagnóstico) depende de campo próprio no ClickUp — pendência de input.',
      },
    };
  }

  /** Dashboard de Closer. */
  async closer(filter: MetricsFilterDto) {
    const leads = await this.leads(filter);
    const closers = [...new Set(leads.map((l) => l.closer ?? '(sem closer)'))];

    const porCloser = closers.map((c) => {
      const grp = leads.filter((l) => (l.closer ?? '(sem closer)') === c);
      const reunioes = grp.filter((l) => l.realizada !== null).length;
      const fechamentos = grp.filter((l) => l.produtoVendido !== null).length;
      // taxa coerente: fechamentos ENTRE os que tiveram reunião (nunca >100%)
      const fechamentosComReuniao = grp.filter(
        (l) => l.realizada !== null && l.produtoVendido !== null,
      ).length;
      const faturamento = grp.reduce(
        (sum, l) => sum + (l.valor ? Number(l.valor) : 0),
        0,
      );
      return {
        closer: c,
        reunioes,
        fechamentos,
        taxaFechamento: pct(fechamentosComReuniao, reunioes),
        sv: grp.filter((l) => l.produtoVendido === 'SV').length,
        projetos: grp.filter((l) => l.produtoVendido === 'Projeto').length,
        holdings: grp.filter((l) => l.produtoVendido === 'Holding').length,
        faturamento,
        ticketMedio: fechamentos ? Math.round(faturamento / fechamentos) : 0,
      };
    });

    return { porCloser };
  }

  /** Dashboard de Reuniões Comerciais. */
  async reunioes(filter: MetricsFilterDto) {
    const leads = await this.leads(filter);
    const realizadas = leads.filter((l) => l.realizada !== null).length;
    const comFechamento = leads.filter(
      (l) => l.realizada !== null && l.produtoVendido !== null,
    ).length;
    return {
      realizadas,
      comFechamento,
      percentualFechamento: pct(comFechamento, realizadas),
    };
  }
}

function pct(part: number, total: number): number {
  if (!total) return 0;
  return Math.round((part / total) * 1000) / 10;
}
