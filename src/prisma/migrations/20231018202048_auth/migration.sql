-- AlterTable
ALTER TABLE "configuration" ADD COLUMN     "authDomain" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "authWalletEncryptedJson" TEXT NOT NULL DEFAULT '';
