import { Module } from '@nestjs/common';
import { ClickUpModule } from '../clickup/clickup.module';
import { GhlModule } from '../ghl/ghl.module';
import { CommercialSyncService } from './commercial-sync.service';
import { GhlSyncService } from './ghl-sync.service';
import { GhlWebhookController } from './ghl-webhook.controller';
import { HoldingsSyncService } from './holdings-sync.service';
import { OperacoesSyncService } from './operacoes-sync.service';
import { SnapshotService } from './snapshot.service';
import { SyncController } from './sync.controller';
import { SyncScheduler } from './sync.scheduler';
import { SyncService } from './sync.service';

@Module({
  imports: [ClickUpModule, GhlModule],
  controllers: [SyncController, GhlWebhookController],
  providers: [
    SyncService,
    HoldingsSyncService,
    CommercialSyncService,
    OperacoesSyncService,
    GhlSyncService,
    SnapshotService,
    SyncScheduler,
  ],
  exports: [SyncService],
})
export class SyncModule {}
