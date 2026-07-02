-- AlterTable
ALTER TABLE "op_tasks" ADD COLUMN     "dateDone" TIMESTAMP(3),
ADD COLUMN     "dueDate" TIMESTAMP(3),
ADD COLUMN     "etapa" TEXT,
ADD COLUMN     "startDate" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "op_task_events" (
    "id" TEXT NOT NULL,
    "opTaskClickupId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "fromValue" TEXT,
    "toValue" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "op_task_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "op_task_events_opTaskClickupId_changedAt_idx" ON "op_task_events"("opTaskClickupId", "changedAt");

-- CreateIndex
CREATE INDEX "op_task_events_kind_idx" ON "op_task_events"("kind");

-- CreateIndex
CREATE UNIQUE INDEX "op_task_events_opTaskClickupId_kind_changedAt_toValue_key" ON "op_task_events"("opTaskClickupId", "kind", "changedAt", "toValue");

-- CreateIndex
CREATE INDEX "op_tasks_etapa_idx" ON "op_tasks"("etapa");
