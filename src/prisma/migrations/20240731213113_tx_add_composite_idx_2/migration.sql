-- CreateIndex
CREATE INDEX CONCURRENTLY "transactions_sentAt_accountAddress_userOpHash_minedAt_error_idx" ON "transactions"("sentAt", "accountAddress", "userOpHash", "minedAt", "errorMessage", "retryCount");
