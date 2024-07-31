-- CreateIndex
CREATE INDEX "transactions_queuedAt_idx" ON "transactions"("queuedAt");

-- CreateIndex
CREATE INDEX "transactions_sentAt_idx" ON "transactions"("sentAt");
