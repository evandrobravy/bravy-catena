import { Injectable, Logger } from '@nestjs/common';
import { ClickUpRateLimiter } from '../clickup/clickup-rate-limiter';
import { GhlRateLimiter } from '../ghl/ghl-rate-limiter';
import { PrismaService } from '../prisma/prisma.service';
import { CommercialSyncService } from './commercial-sync.service';
import { GhlSyncService } from './ghl-sync.service';
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
    private readonly ghlSync: GhlSyncService,
    private readonly snapshot: SnapshotService,
    private readonly limiter: ClickUpRateLimiter,
    private readonly ghlLimiter: GhlRateLimiter,
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
      // GHL só no full: o webhook é o caminho principal (quase tempo real),
      // isto é rede de segurança pro que ele perder. Try/catch próprio pra
      // uma integração nova/menos testada não derrubar o SyncRun inteiro.
      let ghl = 0;
      if (kind === 'full') {
        try {
          this.ghlLimiter.resetCount();
          ghl = await this.ghlSync.sync();
        } catch (err) {
          this.logger.error(
            `GHL backfill falhou (não bloqueia o sync full): ${err instanceof Error ? err.message : err}`,
          );
        }
      }
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
        `Sync ${kind} ok: ${holdings} holdings, ${commercial} comercial, ${ghl} ghl, ${opTasks} op tasks, ${reqCount} req`,
      );
      return { holdings, commercial, ghl, opTasks, reqCount };
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

  /**
   * Backfill manual do GHL — disparado assim que a credencial chega, sem
   * esperar o cron full noturno (ver plano de ingestão GHL, Fase B).
   */
  async runGhlBackfill() {
    if (this.running) {
      this.logger.warn('Sync já em execução, ignorando disparo');
      return { skipped: true };
    }
    this.running = true;
    this.ghlLimiter.resetCount();
    const runRecord = await this.prisma.syncRun.create({
      data: { kind: 'ghl_backfill', status: 'running' },
    });
    try {
      const ghl = await this.ghlSync.sync();
      const reqCount = this.ghlLimiter.requestCount;
      await this.prisma.syncRun.update({
        where: { id: runRecord.id },
        data: { status: 'ok', finishedAt: new Date(), reqCount },
      });
      this.logger.log(`GHL backfill ok: ${ghl} leads, ${reqCount} req`);
      return { ghl, reqCount };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await this.prisma.syncRun.update({
        where: { id: runRecord.id },
        data: {
          status: 'error',
          finishedAt: new Date(),
          reqCount: this.ghlLimiter.requestCount,
          error: message,
        },
      });
      this.logger.error(`GHL backfill falhou: ${message}`);
      throw err;
    } finally {
      this.running = false;
    }
  }
}
