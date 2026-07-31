import { Injectable, Logger } from '@nestjs/common';
import { GhlService } from '../ghl/ghl.service';
import {
  mapContact,
  MappedGhlLead,
} from '../ghl/mappers/contact.mapper';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GhlSyncService {
  private readonly logger = new Logger(GhlSyncService.name);

  constructor(
    private readonly ghl: GhlService,
    private readonly prisma: PrismaService,
  ) {}

  /** Rescan completo dos contatos da location — ver plano, seção 3 (backfill). */
  async sync(): Promise<number> {
    if (!this.ghl.configurado) {
      this.logger.log('GHL sem credencial configurada — backfill ignorado.');
      return 0;
    }
    const contacts = await this.ghl.getAllContacts();
    this.logger.log(`Contatos GHL recebidos: ${contacts.length}`);
    let count = 0;
    for (const c of contacts) {
      const m = mapContact(c);
      if (!m) continue;
      await this.upsertLead(m);
      count += 1;
    }
    return count;
  }

  /** Upsert idempotente por ghlContactId — usado pelo backfill e pelo webhook. */
  async upsertLead(m: MappedGhlLead): Promise<void> {
    await this.prisma.lead.upsert({
      where: { ghlContactId: m.ghlContactId },
      create: m,
      update: {
        name: m.name,
        status: m.status,
        dateCreated: m.dateCreated,
      },
    });
  }
}
