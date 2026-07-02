import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClickUpService } from '../clickup/clickup.service';
import { STAGE_DEFS } from '../clickup/clickup.constants';
import { STAGE_SLA_DIAS } from '../config/parametros';
import { mapHolding } from '../clickup/mappers/client.mapper';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HoldingsSyncService {
  private readonly logger = new Logger(HoldingsSyncService.name);

  constructor(
    private readonly clickup: ClickUpService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /** Garante que os StageDef (marcos 01–08) existem. */
  async ensureStageDefs() {
    for (const def of STAGE_DEFS) {
      const slaDays = STAGE_SLA_DIAS[def.id] ?? null;
      await this.prisma.stageDef.upsert({
        where: { id: def.id },
        create: { id: def.id, code: def.code, name: def.name, slaDays },
        update: { code: def.code, name: def.name, slaDays },
      });
    }
  }

  async sync(opts: { dateUpdatedGt?: number } = {}): Promise<number> {
    await this.ensureStageDefs();
    const listId = this.config.getOrThrow<string>('CLICKUP_LIST_HOLDINGS');
    const tasks = await this.clickup.getListTasks(listId, opts);
    this.logger.log(`Holdings recebidas: ${tasks.length}`);

    for (const task of tasks) {
      const m = mapHolding(task);

      const prevStatus = await this.prisma.client
        .findUnique({ where: { clickupId: m.clickupId }, select: { status: true } })
        .then((c) => c?.status ?? null);

      const client = await this.prisma.client.upsert({
        where: { clickupId: m.clickupId },
        create: {
          clickupId: m.clickupId,
          name: m.name,
          status: m.status,
          modelo: m.modelo,
          progresso: m.progresso,
          contador: m.contador,
          patrimonio: m.patrimonio,
          currentStage: m.currentStage,
          dueDate: m.dueDate,
          dateCreated: m.dateCreated,
          dateUpdated: m.dateUpdated,
        },
        update: {
          name: m.name,
          status: m.status,
          modelo: m.modelo,
          progresso: m.progresso,
          contador: m.contador,
          patrimonio: m.patrimonio,
          currentStage: m.currentStage,
          dueDate: m.dueDate,
          dateUpdated: m.dateUpdated,
        },
      });

      // diffing de status -> StatusEvent
      if (prevStatus !== null && prevStatus !== m.status) {
        await this.prisma.statusEvent.create({
          data: {
            clientId: client.id,
            entity: 'client',
            refId: m.clickupId,
            fromStatus: prevStatus,
            toStatus: m.status,
            changedAt: m.dateUpdated,
          },
        });
      }

      // etapas
      for (const s of m.stages) {
        await this.prisma.clientStage.upsert({
          where: {
            clientId_stageDefId: {
              clientId: client.id,
              stageDefId: s.stageDefId,
            },
          },
          create: {
            clientId: client.id,
            stageDefId: s.stageDefId,
            totalTasks: s.totalTasks,
            doneTasks: s.doneTasks,
            completedAt: s.completedAt,
          },
          update: {
            totalTasks: s.totalTasks,
            doneTasks: s.doneTasks,
            completedAt: s.completedAt,
          },
        });

        // stubs de OpTask: linkagem op task -> cliente/etapa (enriquecidos no operacoes-sync)
        for (const opId of s.opTaskIds) {
          await this.prisma.opTask.upsert({
            where: { clickupId: opId },
            create: {
              clickupId: opId,
              clientId: client.id,
              stageDefId: s.stageDefId,
              name: opId,
            },
            update: {
              clientId: client.id,
              stageDefId: s.stageDefId,
            },
          });
        }
      }
    }
    return tasks.length;
  }
}
