import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

function daysSince(d: Date | null | undefined): number {
  if (!d) return 0;
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

@Injectable()
export class SnapshotService {
  private readonly logger = new Logger(SnapshotService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Gera 1 ClientSnapshot por cliente para o dia corrente. */
  async run(): Promise<number> {
    const clients = await this.prisma.client.findMany();
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    for (const c of clients) {
      const ageDays = daysSince(c.dateCreated);
      const daysNoChange = c.lastEvolutionAt
        ? daysSince(c.lastEvolutionAt)
        : ageDays;
      // daysInStage: aproximação pela última evolução (sem histórico de etapa ainda)
      const daysInStage = daysNoChange;

      await this.prisma.clientSnapshot.upsert({
        where: {
          clientId_snapshotDate: { clientId: c.id, snapshotDate: today },
        },
        create: {
          clientId: c.id,
          snapshotDate: today,
          status: c.status,
          currentStage: c.currentStage,
          progresso: c.progresso,
          ageDays,
          daysInStage,
          daysNoChange,
        },
        update: {
          status: c.status,
          currentStage: c.currentStage,
          progresso: c.progresso,
          ageDays,
          daysInStage,
          daysNoChange,
        },
      });
    }
    this.logger.log(`Snapshots gravados: ${clients.length}`);
    return clients.length;
  }
}
