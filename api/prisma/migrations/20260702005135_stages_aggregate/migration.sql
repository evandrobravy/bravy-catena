/*
  Warnings:

  - You are about to drop the column `opListId` on the `client_stages` table. All the data in the column will be lost.
  - You are about to drop the column `opTaskId` on the `client_stages` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "client_stages" DROP COLUMN "opListId",
DROP COLUMN "opTaskId",
ADD COLUMN     "doneTasks" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalTasks" INTEGER NOT NULL DEFAULT 0;
