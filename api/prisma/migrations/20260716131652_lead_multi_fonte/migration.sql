-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "fonte" TEXT NOT NULL DEFAULT 'clickup',
ADD COLUMN     "ghlContactId" TEXT,
ALTER COLUMN "clickupId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "leads_ghlContactId_key" ON "leads"("ghlContactId");

-- CreateIndex
CREATE INDEX "leads_fonte_idx" ON "leads"("fonte");

