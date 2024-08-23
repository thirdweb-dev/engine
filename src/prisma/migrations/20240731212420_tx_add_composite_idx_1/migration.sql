-- CreateIndex
CREATE INDEX CONCURRENTLY "transactions_sentAt_minedAt_cancelledAt_errorMessage_queued_idx" ON "transactions"("sentAt", "minedAt", "cancelledAt", "errorMessage", "queuedAt");
