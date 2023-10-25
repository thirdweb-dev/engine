/*
  Warnings:

  - Made the column `secret` on table `webhooks` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "configuration" ALTER COLUMN "minWalletBalance" SET DEFAULT '20000000000000000';

-- AlterTable
ALTER TABLE "permissions" ADD COLUMN     "label" TEXT;

-- AlterTable
ALTER TABLE "tokens" ADD COLUMN     "label" TEXT;

-- AlterTable
ALTER TABLE "wallet_details" ADD COLUMN     "label" TEXT;

-- AlterTable
ALTER TABLE "webhooks" ALTER COLUMN "name" DROP NOT NULL,
ALTER COLUMN "secret" SET NOT NULL;
