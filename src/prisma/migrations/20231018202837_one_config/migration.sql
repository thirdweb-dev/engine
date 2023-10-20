/*
  Warnings:

  - A unique constraint covering the columns `[id]` on the table `configuration` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "configuration" ALTER COLUMN "id" SET DEFAULT 'default';

-- CreateIndex
CREATE UNIQUE INDEX "configuration_id_key" ON "configuration"("id");
