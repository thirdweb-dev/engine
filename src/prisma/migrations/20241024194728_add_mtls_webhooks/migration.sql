-- AlterTable
ALTER TABLE "webhooks" ADD COLUMN     "mtlsCaCert" TEXT,
ADD COLUMN     "mtlsClientCert" TEXT,
ADD COLUMN     "mtlsClientKey" TEXT;
