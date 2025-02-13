-- AlterTable
ALTER TABLE "configuration" ADD COLUMN     "walletSubscriptionsCronSchedule" TEXT;

-- CreateTable
CREATE TABLE "wallet_subscriptions" (
    "id" TEXT NOT NULL,
    "chainId" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "conditions" JSONB[],
    "webhookId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "wallet_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "wallet_subscriptions_chainId_idx" ON "wallet_subscriptions"("chainId");

-- CreateIndex
CREATE INDEX "wallet_subscriptions_walletAddress_idx" ON "wallet_subscriptions"("walletAddress");

-- AddForeignKey
ALTER TABLE "wallet_subscriptions" ADD CONSTRAINT "wallet_subscriptions_webhookId_fkey" FOREIGN KEY ("webhookId") REFERENCES "webhooks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
