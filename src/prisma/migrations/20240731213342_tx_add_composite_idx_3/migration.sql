-- CreateIndex
CREATE INDEX CONCURRENTLY "transactions_sentAt_transactionHash_accountAddress_minedAt__idx" ON "transactions"("sentAt", "transactionHash", "accountAddress", "minedAt", "errorMessage", "nonce");
