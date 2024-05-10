-- AlterTable
ALTER TABLE "contract_subscriptions" ADD COLUMN     "webhookId" INTEGER;

-- AddForeignKey
ALTER TABLE "contract_subscriptions" ADD CONSTRAINT "contract_subscriptions_webhookId_fkey" FOREIGN KEY ("webhookId") REFERENCES "webhooks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
