import { Injectable } from '@nestjs/common';
import { Lead } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MetricsFilterDto } from './dto/filters.dto';

@Injectable()
export class ComercialService {
  constructor(private readonly prisma: PrismaService) {}

  private async leads(filter: MetricsFilterDto): Promise<Lead[]> {
    return this.prisma.lead.findMany({
      where: {
        ...(filter.seminario ? { seminario: filter.seminario } : {}),
        ...(filter.closer ? { closer: filter.closer } : {}),
      },
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
      const sv = grp.filter((l) => l.produtoVendido === 'SV').length;
      const projetos = grp.filter((l) => l.produtoVendido === 'Projeto').length;
      const holdings = grp.filter((l) => l.produtoVendido === 'Holding').length;
      return {
        seminario: s,
        leads: grp.length,
        agendamentos,
        reunioes,
        sv,
        projetos,
        holdings,
        conversoes: {
          leadReuniao: pct(reunioes, grp.length),
          reuniaoSV: pct(sv, reunioes),
          svProjeto: pct(projetos, sv),
          projetoHolding: pct(holdings, projetos),
          totalAteHolding: pct(holdings, grp.length),
        },
      };
    });

    return {
      porSeminario,
      avisos: {
        dados:
          'Campos "Seminário de Origem" e "Produto Vendido" estão pouco preenchidos no ClickUp; os números populam conforme o comercial preenche.',
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
      const faturamento = grp.reduce(
        (sum, l) => sum + (l.valor ? Number(l.valor) : 0),
        0,
      );
      return {
        closer: c,
        reunioes,
        fechamentos,
        taxaFechamento: pct(fechamentos, reunioes),
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
