-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "lastEvolutionAt" TIMESTAMP(3),
ADD COLUMN     "responsavel" TEXT;

-- CreateTable
CREATE TABLE "op_tasks" (
    "id" TEXT NOT NULL,
    "clickupId" TEXT NOT NULL,
    "clientId" TEXT,
    "stageDefId" INTEGER,
    "listId" TEXT,
    "listName" TEXT,
    "name" TEXT NOT NULL,
    "status" TEXT,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "assignee" TEXT,
    "statusChangedAt" TIMESTAMP(3),
    "dateCreated" TIMESTAMP(3),
    "dateUpdated" TIMESTAMP(3),

    CONSTRAINT "op_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "op_tasks_clickupId_key" ON "op_tasks"("clickupId");

-- CreateIndex
CREATE INDEX "op_tasks_clientId_idx" ON "op_tasks"("clientId");

-- CreateIndex
CREATE INDEX "op_tasks_stageDefId_idx" ON "op_tasks"("stageDefId");

-- CreateIndex
CREATE INDEX "op_tasks_assignee_idx" ON "op_tasks"("assignee");

-- AddForeignKey
ALTER TABLE "op_tasks" ADD CONSTRAINT "op_tasks_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
