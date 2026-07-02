import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClickUpService } from '../clickup/clickup.service';
import { mapDeal } from '../clickup/mappers/deal.mapper';
import { mapLead } from '../clickup/mappers/lead.mapper';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CommercialSyncService {
  private readonly logger = new Logger(CommercialSyncService.name);

  constructor(
    private readonly clickup: ClickUpService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async sync(opts: { dateUpdatedGt?: number } = {}): Promise<number> {
    let count = 0;
    count += await this.syncLeads(opts);
    count += await this.syncDeals(opts);
    return count;
  }

  private async syncLeads(opts: { dateUpdatedGt?: number }): Promise<number> {
    const listId = this.config.getOrThrow<string>('CLICKUP_LIST_SEMINARIOS');
    const tasks = await this.clickup.getListTasks(listId, opts);
    this.logger.log(`Leads recebidos: ${tasks.length}`);
    for (const task of tasks) {
      const m = mapLead(task);
      await this.prisma.lead.upsert({
        where: { clickupId: m.clickupId },
        create: m,
        update: {
          name: m.name,
          status: m.status,
          seminario: m.seminario,
          closer: m.closer,
          produtoVendido: m.produtoVendido,
          valor: m.valor,
          agendamento: m.agendamento,
          realizada: m.realizada,
        },
      });
    }
    return tasks.length;
  }

  private async syncDeals(opts: { dateUpdatedGt?: number }): Promise<number> {
    const sources: { listKey: string; tipo: 'SV' | 'Projeto' }[] = [
      { listKey: 'CLICKUP_LIST_SESSAO_VIAB', tipo: 'SV' },
      { listKey: 'CLICKUP_LIST_PROJETO_ESTRUTURAL', tipo: 'Projeto' },
    ];
    let total = 0;
    for (const src of sources) {
      const listId = this.config.getOrThrow<string>(src.listKey);
      const tasks = await this.clickup.getListTasks(listId, opts);
      this.logger.log(`Deals ${src.tipo} recebidos: ${tasks.length}`);
      for (const task of tasks) {
        const m = mapDeal(task, src.tipo);
        await this.prisma.deal.upsert({
          where: { clickupId: m.clickupId },
          create: m,
          update: {
            tipo: m.tipo,
            status: m.status,
            valor: m.valor,
            atendimento: m.atendimento,
          },
        });
      }
      total += tasks.length;
    }
    return total;
  }
}
