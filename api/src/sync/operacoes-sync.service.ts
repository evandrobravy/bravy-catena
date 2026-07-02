import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClickUpService } from '../clickup/clickup.service';
import { mapOpTask } from '../clickup/mappers/optask.mapper';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OperacoesSyncService {
  private readonly logger = new Logger(OperacoesSyncService.name);

  constructor(
    private readonly clickup: ClickUpService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async sync(opts: { dateUpdatedGt?: number } = {}): Promise<number> {
    const spaceId = this.config.getOrThrow<string>('CLICKUP_SPACE_OPERACOES');
    const listIds = await this.clickup.getSpaceListIds(spaceId);
    this.logger.log(`Lists de Operações: ${listIds.length}`);

    let count = 0;
    for (const listId of listIds) {
      const tasks = await this.clickup.getListTasks(listId, opts);
      for (const task of tasks) {
        const m = mapOpTask(task);

        const prev = await this.prisma.opTask.findUnique({
          where: { clickupId: m.clickupId },
          select: { id: true, clientId: true, status: true, statusChangedAt: true },
        });

        const statusChanged = prev && prev.status !== null && prev.status !== m.status;
        const statusChangedAt = statusChanged
          ? m.dateUpdated ?? new Date()
          : prev?.statusChangedAt ?? m.dateUpdated ?? null;

        await this.prisma.opTask.upsert({
          where: { clickupId: m.clickupId },
          create: {
            clickupId: m.clickupId,
            name: m.name,
            etapa: m.etapa,
            status: m.status,
            done: m.done,
            assignee: m.assignee,
            listId: m.listId,
            listName: m.listName,
            statusChangedAt,
            startDate: m.startDate,
            dueDate: m.dueDate,
            dateDone: m.dateDone,
            dateCreated: m.dateCreated,
            dateUpdated: m.dateUpdated,
          },
          update: {
            name: m.name,
            etapa: m.etapa,
            status: m.status,
            done: m.done,
            assignee: m.assignee,
            listId: m.listId,
            listName: m.listName,
            statusChangedAt,
            startDate: m.startDate,
            dueDate: m.dueDate,
            dateDone: m.dateDone,
            dateUpdated: m.dateUpdated,
          },
        });

        // diffing: mudança de status -> StatusEvent (só se linkado a um cliente)
        if (statusChanged && prev?.clientId) {
          await this.prisma.statusEvent.create({
            data: {
              clientId: prev.clientId,
              entity: 'opTask',
              refId: m.clickupId,
              fromStatus: prev.status,
              toStatus: m.status ?? '',
              changedAt: statusChangedAt ?? new Date(),
            },
          });
        }
        count += 1;
      }
    }

    await this.recomputeLastEvolution();
    return count;
  }

  /** Client.lastEvolutionAt = máx. mudança de status entre as op tasks do cliente. */
  private async recomputeLastEvolution() {
    const rows = await this.prisma.opTask.groupBy({
      by: ['clientId'],
      where: { clientId: { not: null } },
      _max: { statusChangedAt: true },
    });
    for (const r of rows) {
      if (!r.clientId) continue;
      await this.prisma.client.update({
        where: { id: r.clientId },
        data: { lastEvolutionAt: r._max.statusChangedAt },
      });
    }
  }
}
