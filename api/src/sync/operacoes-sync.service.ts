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
          select: {
            id: true,
            clientId: true,
            status: true,
            statusChangedAt: true,
            listId: true,
            listName: true,
          },
        });

        const statusChanged = prev && prev.status !== null && prev.status !== m.status;
        // não inventar statusChangedAt: sem mudança observada, preserva o valor
        // real (backfill via op_task_events) em vez de assumir dateUpdated
        const statusChangedAt = statusChanged
          ? m.dateUpdated ?? new Date()
          : prev?.statusChangedAt ?? null;

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
            // não sobrescrever dateDone real (backfill) com null do ClickUp
            dateDone: m.dateDone ?? undefined,
            dateUpdated: m.dateUpdated,
          },
        });

        // diffing -> op_task_events (mesma tabela do backfill; chave única torna idempotente)
        if (statusChanged) {
          await this.prisma.opTaskEvent.createMany({
            data: [
              {
                opTaskClickupId: m.clickupId,
                kind: 'status',
                fromValue: prev.status,
                toValue: m.status ?? '',
                changedAt: statusChangedAt ?? new Date(),
              },
            ],
            skipDuplicates: true,
          });
        }
        if (prev && prev.listId && m.listId && prev.listId !== m.listId) {
          await this.prisma.opTaskEvent.createMany({
            data: [
              {
                opTaskClickupId: m.clickupId,
                kind: 'list',
                fromValue: prev.listName,
                toValue: m.listName ?? '',
                changedAt: m.dateUpdated ?? new Date(),
              },
            ],
            skipDuplicates: true,
          });
        }
        count += 1;
      }
    }

    await this.recomputeLastEvolution();
    return count;
  }

  /**
   * Client.lastEvolutionAt = máx. mudança de status REAL (op_task_events) entre
   * as tasks do cliente. Nunca seta null — preserva o backfill quando não há evento.
   */
  private async recomputeLastEvolution() {
    await this.prisma.$executeRaw`
      UPDATE clients c SET "lastEvolutionAt" = e.max_at
      FROM (
        SELECT t."clientId", max(ev."changedAt") AS max_at
        FROM op_task_events ev
        JOIN op_tasks t ON t."clickupId" = ev."opTaskClickupId"
        WHERE ev.kind = 'status' AND t."clientId" IS NOT NULL
        GROUP BY t."clientId"
      ) e
      WHERE c.id = e."clientId"
        AND c."lastEvolutionAt" IS DISTINCT FROM e.max_at`;
  }
}
