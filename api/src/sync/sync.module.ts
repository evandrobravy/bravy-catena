import { Module } from '@nestjs/common';
import { ClickUpModule } from '../clickup/clickup.module';
import { CommercialSyncService } from './commercial-sync.service';
import { HoldingsSyncService } from './holdings-sync.service';
import { OperacoesSyncService } from './operacoes-sync.service';
import { SnapshotService } from './snapshot.service';
import { SyncController } from './sync.controller';
import { SyncScheduler } from './sync.scheduler';
import { SyncService } from './sync.service';

@Module({
  imports: [ClickUpModule],
  controllers: [SyncController],
  providers: [
    SyncService,
    HoldingsSyncService,
    CommercialSyncService,
    OperacoesSyncService,
    SnapshotService,
    SyncScheduler,
  ],
  exports: [SyncService],
})
export class SyncModule {}
