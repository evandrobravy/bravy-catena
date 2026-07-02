import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SyncService } from './sync.service';

@Injectable()
export class SyncScheduler {
  private readonly logger = new Logger(SyncScheduler.name);
  private lastRun = 0;

  constructor(private readonly sync: SyncService) {}

  // Incremental a cada 20 minutos
  @Cron('0 */20 * * * *')
  async incremental() {
    const since = this.lastRun || Date.now() - 24 * 60 * 60 * 1000;
    this.logger.log('Cron incremental disparado');
    await this.sync.run('incremental', since);
    this.lastRun = Date.now();
  }

  // Full nightly às 03:00
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async nightly() {
    this.logger.log('Cron nightly (full) disparado');
    await this.sync.run('full');
    this.lastRun = Date.now();
  }
}
