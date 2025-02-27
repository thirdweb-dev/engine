import { db } from "../../db/connection";
import { transactions } from "../../db/schema";
import { and, eq } from "drizzle-orm";
import { initializeLogger } from "../../lib/logger";
import { sendWorker, type SendResult } from "../external-bundler-async";
import type { Job } from "bullmq";

const sendLogger = initializeLogger(
  "executor:external-bundler:send-handler"
);

// This handler is called when a UserOp is sent by the async executor
// It updates the transaction record with the userOpHash
export async function externalBundlerSendHandler(
  _job: Job, // Unused parameter but required by BullMQ
  result: SendResult
) {
  try {
    await db
      .update(transactions)
      .set({
        executionResult: {
          status: "SUBMITTED",
          monitoringStatus: "WILL_MONITOR",
          userOpHash: result.userOpHash,
        },
      })
      // 4337 transactions always create a single transaction in the db, with batchIndex 0
      .where(
        and(eq(transactions.id, result.id), eq(transactions.batchIndex, 0))
      );
      
    sendLogger.info(`Updated transaction ${result.id} with userOpHash ${result.userOpHash}`);
  } catch (err) {
    sendLogger.error("Failed to update transaction with userOpHash", err, {
      id: result.id,
      userOpHash: result.userOpHash,
    });
  }
}

// Register the send handler with the async executor's send worker
sendWorker.on("completed", externalBundlerSendHandler); 