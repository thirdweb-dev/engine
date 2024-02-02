-- AlterTable
ALTER TABLE "configuration" ADD COLUMN "accessControlAllowOrigin" TEXT NOT NULL DEFAULT 'https://thirdweb.com,https://embed.ipfscdn.io';
