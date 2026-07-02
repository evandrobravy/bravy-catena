-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "clickupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "modelo" TEXT,
    "progresso" DOUBLE PRECISION,
    "contador" TEXT,
    "patrimonio" DECIMAL(14,2),
    "currentStage" INTEGER,
    "dueDate" TIMESTAMP(3),
    "dateCreated" TIMESTAMP(3) NOT NULL,
    "dateUpdated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stage_defs" (
    "id" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slaDays" INTEGER,

    CONSTRAINT "stage_defs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_stages" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "stageDefId" INTEGER NOT NULL,
    "completedAt" TIMESTAMP(3),
    "tempoDias" DOUBLE PRECISION,
    "opTaskId" TEXT,
    "opListId" TEXT,

    CONSTRAINT "client_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "status_events" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "refId" TEXT,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL,
    "source" TEXT,

    CONSTRAINT "status_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_snapshots" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "snapshotDate" DATE NOT NULL,
    "status" TEXT NOT NULL,
    "currentStage" INTEGER,
    "progresso" DOUBLE PRECISION,
    "ageDays" INTEGER NOT NULL,
    "daysInStage" INTEGER NOT NULL,
    "daysNoChange" INTEGER NOT NULL,

    CONSTRAINT "client_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "clickupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "seminario" TEXT,
    "closer" TEXT,
    "produtoVendido" TEXT,
    "valor" DECIMAL(14,2),
    "agendamento" TIMESTAMP(3),
    "realizada" TIMESTAMP(3),
    "dateCreated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deals" (
    "id" TEXT NOT NULL,
    "clickupId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "valor" DECIMAL(14,2),
    "atendimento" TEXT,
    "leadClickupId" TEXT,
    "dateCreated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_runs" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "reqCount" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,

    CONSTRAINT "sync_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clients_clickupId_key" ON "clients"("clickupId");

-- CreateIndex
CREATE INDEX "clients_status_idx" ON "clients"("status");

-- CreateIndex
CREATE INDEX "clients_modelo_idx" ON "clients"("modelo");

-- CreateIndex
CREATE UNIQUE INDEX "stage_defs_code_key" ON "stage_defs"("code");

-- CreateIndex
CREATE UNIQUE INDEX "client_stages_clientId_stageDefId_key" ON "client_stages"("clientId", "stageDefId");

-- CreateIndex
CREATE INDEX "status_events_clientId_changedAt_idx" ON "status_events"("clientId", "changedAt");

-- CreateIndex
CREATE INDEX "client_snapshots_snapshotDate_idx" ON "client_snapshots"("snapshotDate");

-- CreateIndex
CREATE UNIQUE INDEX "client_snapshots_clientId_snapshotDate_key" ON "client_snapshots"("clientId", "snapshotDate");

-- CreateIndex
CREATE UNIQUE INDEX "leads_clickupId_key" ON "leads"("clickupId");

-- CreateIndex
CREATE INDEX "leads_seminario_idx" ON "leads"("seminario");

-- CreateIndex
CREATE INDEX "leads_closer_idx" ON "leads"("closer");

-- CreateIndex
CREATE INDEX "leads_status_idx" ON "leads"("status");

-- CreateIndex
CREATE UNIQUE INDEX "deals_clickupId_key" ON "deals"("clickupId");

-- CreateIndex
CREATE INDEX "deals_tipo_idx" ON "deals"("tipo");

-- CreateIndex
CREATE INDEX "deals_status_idx" ON "deals"("status");

-- AddForeignKey
ALTER TABLE "client_stages" ADD CONSTRAINT "client_stages_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_stages" ADD CONSTRAINT "client_stages_stageDefId_fkey" FOREIGN KEY ("stageDefId") REFERENCES "stage_defs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "status_events" ADD CONSTRAINT "status_events_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_snapshots" ADD CONSTRAINT "client_snapshots_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
