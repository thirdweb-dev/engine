/*
  Warnings:

  - You are about to drop the column `webhookAuthBearerToken` on the `configuration` table. All the data in the column will be lost.
  - You are about to drop the column `webhookUrl` on the `configuration` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "configuration" DROP COLUMN "webhookAuthBearerToken",
DROP COLUMN "webhookUrl",
ADD COLUMN     "minWalletBalance" TEXT NOT NULL DEFAULT '20000000000000000';

-- CreateTable
CREATE TABLE "webhooks" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT,
    "evenType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "webhooks_pkey" PRIMARY KEY ("id")
);
