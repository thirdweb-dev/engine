-- AlterTable
ALTER TABLE "configuration" ADD COLUMN     "balanceSubscriptionsCronSchedule" TEXT;

-- CreateTable
CREATE TABLE "balance_subscriptions" (
    "id" TEXT NOT NULL,
    "chainId" TEXT NOT NULL,
    "tokenAddress" TEXT,
    "walletAddress" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "webhookId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "balance_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "balance_subscriptions_chainId_idx" ON "balance_subscriptions"("chainId");

-- CreateIndex
CREATE INDEX "balance_subscriptions_tokenAddress_idx" ON "balance_subscriptions"("tokenAddress");

-- CreateIndex
CREATE INDEX "balance_subscriptions_walletAddress_idx" ON "balance_subscriptions"("walletAddress");

-- AddForeignKey
ALTER TABLE "balance_subscriptions" ADD CONSTRAINT "balance_subscriptions_webhookId_fkey" FOREIGN KEY ("webhookId") REFERENCES "webhooks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
