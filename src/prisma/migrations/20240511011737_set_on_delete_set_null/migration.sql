-- DropForeignKey
ALTER TABLE "contract_subscriptions" DROP CONSTRAINT "contract_subscriptions_webhookId_fkey";

-- AddForeignKey
ALTER TABLE "contract_subscriptions" ADD CONSTRAINT "contract_subscriptions_webhookId_fkey" FOREIGN KEY ("webhookId") REFERENCES "webhooks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
