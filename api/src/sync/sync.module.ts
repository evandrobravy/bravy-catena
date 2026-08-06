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
import { UnnichatSyncService } from './unnichat-sync.service';
import { UnnichatWebhookController } from './unnichat-webhook.controller';

@Module({
  imports: [ClickUpModule, GhlModule],
  controllers: [SyncController, GhlWebhookController, UnnichatWebhookController],
  providers: [
    SyncService,
    HoldingsSyncService,
    CommercialSyncService,
    OperacoesSyncService,
    GhlSyncService,
    UnnichatSyncService,
    SnapshotService,
    SyncScheduler,
  ],
  exports: [SyncService],
})
export class SyncModule {}
