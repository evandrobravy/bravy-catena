import { Injectable, Logger } from '@nestjs/common';
import { MappedUnnichatLead } from '../unnichat/mappers/lead.mapper';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UnnichatSyncService {
  private readonly logger = new Logger(UnnichatSyncService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Upsert idempotente por externalId — o webhook pode reenviar o mesmo lead. */
  async upsertLead(m: MappedUnnichatLead): Promise<void> {
    await this.prisma.lead.upsert({
      where: { externalId: m.externalId },
      create: m,
      update: {
        name: m.name,
        status: m.status,
        seminario: m.seminario,
        closer: m.closer,
        dateCreated: m.dateCreated,
      },
    });
    this.logger.log(`Lead UnniChat gravado: ${m.externalId} (${m.name})`);
  }
}
