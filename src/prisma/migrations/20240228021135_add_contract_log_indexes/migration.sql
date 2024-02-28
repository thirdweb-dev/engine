-- CreateIndex
CREATE INDEX "contract_event_logs_timestamp_idx" ON "contract_event_logs"("timestamp");

-- CreateIndex
CREATE INDEX "contract_event_logs_blockNumber_idx" ON "contract_event_logs"("blockNumber");

-- CreateIndex
CREATE INDEX "contract_event_logs_contractAddress_idx" ON "contract_event_logs"("contractAddress");

-- CreateIndex
CREATE INDEX "contract_event_logs_topic0_idx" ON "contract_event_logs"("topic0");

-- CreateIndex
CREATE INDEX "contract_event_logs_topic1_idx" ON "contract_event_logs"("topic1");

-- CreateIndex
CREATE INDEX "contract_event_logs_topic2_idx" ON "contract_event_logs"("topic2");

-- CreateIndex
CREATE INDEX "contract_event_logs_topic3_idx" ON "contract_event_logs"("topic3");
