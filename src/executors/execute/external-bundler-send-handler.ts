import type { Job } from "bullmq";
import { and, eq } from "drizzle-orm";
import { db } from "../../db/connection.js";
import { transactions } from "../../db/schema.js";
import { initializeLogger } from "../../lib/logger.js";
import { type SendResult, sendWorker } from "../external-bundler-async";

const sendLogger = initializeLogger("executor:external-bundler:send-handler");

// This handler is called when a UserOp is sent by the async executor
// It updates the transaction record with the userOpHash
export async function externalBundlerSendHandler(
  _job: Job, // Unused parameter but required by BullMQ
  result: SendResult,
) {
  const userOpHash = result.status === "QUEUED" ? result.userOpHash : undefined;
  const executionResult =
    result.status === "QUEUED"
      ? ({
          status: "SUBMITTED",
          monitoringStatus: "WILL_MONITOR",
          userOpHash: result.userOpHash,
        } as const)
      : ({
          status: "FAILED",
          error: result.error,
        } as const);
  try {
    await db
      .update(transactions)
      .set({
        executionResult,
      })
      // 4337 transactions always create a single transaction in the db, with batchIndex 0
      .where(
        and(eq(transactions.id, result.id), eq(transactions.batchIndex, 0)),
      );

    sendLogger.info(
      `Updated transaction ${result.id} with userOpHash ${userOpHash}`,
    );
  } catch (err) {
    sendLogger.error("Failed to update transaction with userOpHash", err, {
      id: result.id,
      userOpHash: userOpHash,
    });
  }
}

// Register the send handler with the async executor's send worker
sendWorker.on("completed", externalBundlerSendHandler);
