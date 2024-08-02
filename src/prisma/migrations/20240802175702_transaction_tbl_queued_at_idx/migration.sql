-- CreateIndex
CREATE INDEX CONCURRENTLY "transactions_queuedAt_idx" ON "transactions"("queuedAt");
