import { Injectable, Logger } from '@nestjs/common';
import { ClickUpRateLimiter } from '../clickup/clickup-rate-limiter';
import { PrismaService } from '../prisma/prisma.service';
import { CommercialSyncService } from './commercial-sync.service';
import { HoldingsSyncService } from './holdings-sync.service';
import { OperacoesSyncService } from './operacoes-sync.service';
import { SnapshotService } from './snapshot.service';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);
  private running = false;

  constructor(
    private readonly holdings: HoldingsSyncService,
    private readonly commercial: CommercialSyncService,
    private readonly operacoes: OperacoesSyncService,
    private readonly snapshot: SnapshotService,
    private readonly limiter: ClickUpRateLimiter,
    private readonly prisma: PrismaService,
  ) {}

  async run(kind: 'incremental' | 'full', dateUpdatedGt?: number) {
    if (this.running) {
      this.logger.warn('Sync já em execução, ignorando disparo');
      return { skipped: true };
    }
    this.running = true;
    this.limiter.resetCount();
    const runRecord = await this.prisma.syncRun.create({
      data: { kind, status: 'running' },
    });
    try {
      const holdings = await this.holdings.sync({ dateUpdatedGt });
      const commercial = await this.commercial.sync({ dateUpdatedGt });
      // operações depois das holdings (usa os stubs de OpTask já linkados)
      const opTasks = await this.operacoes.sync({ dateUpdatedGt });
      if (kind === 'full') {
        await this.snapshot.run();
      }
      const reqCount = this.limiter.requestCount;
      await this.prisma.syncRun.update({
        where: { id: runRecord.id },
        data: { status: 'ok', finishedAt: new Date(), reqCount },
      });
      this.logger.log(
        `Sync ${kind} ok: ${holdings} holdings, ${commercial} comercial, ${opTasks} op tasks, ${reqCount} req`,
      );
      return { holdings, commercial, opTasks, reqCount };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await this.prisma.syncRun.update({
        where: { id: runRecord.id },
        data: {
          status: 'error',
          finishedAt: new Date(),
          reqCount: this.limiter.requestCount,
          error: message,
        },
      });
      this.logger.error(`Sync ${kind} falhou: ${message}`);
      throw err;
    } finally {
      this.running = false;
    }
  }
}
