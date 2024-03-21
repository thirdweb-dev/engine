/*
  Warnings:

  - A unique constraint covering the columns `[idempotencyKey]` on the table `transactions` will be added. If there are existing duplicate values, this will fail.
  - Made the column `idempotencyKey` on table `transactions` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "transactions" ALTER COLUMN "idempotencyKey" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "transactions_idempotencyKey_key" ON "transactions"("idempotencyKey");
