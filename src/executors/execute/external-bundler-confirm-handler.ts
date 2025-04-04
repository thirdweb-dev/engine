import SuperJSON from "superjson";
import { db } from "../../db/connection.js";
import { transactions } from "../../db/schema.js";
import { registerCallback, type ConfirmationResult } from "../external-bundler";
import { registerCallback as registerExternalBundlerAsyncConfirmCallback } from "../external-bundler-async";
import type {
  ExecutionResult4337Serialized,
  RevertDataSerialized,
} from "../../db/types.js";
import { and, eq } from "drizzle-orm";
import { initializeLogger } from "../../lib/logger.js";

const confirmLogger = initializeLogger(
  "executor:external-bundler:confirm-handler"
);

// not using neverthrow here, this handler response doesn't go to the user
export async function externalBundlerConfirmHandler(
  result: ConfirmationResult
) {
  const executionResult: ExecutionResult4337Serialized =
    result.onchainStatus === "REVERTED"
      ? {
          status: "CONFIRMED",
          onchainStatus: "REVERTED",
          revertData: result.revertData
            ? (SuperJSON.serialize(result.revertData)
                .json as unknown as RevertDataSerialized)
            : undefined,
          actualGasCost: result.actualGasCost.toString(),
          actualGasUsed: result.actualGasUsed.toString(),
          nonce: result.nonce.toString(),
          userOpHash: result.userOpHash,
          transactionHash: result.transactionHash,
        }
      : {
          status: "CONFIRMED",
          onchainStatus: "SUCCESS",
          transactionHash: result.transactionHash,
          actualGasCost: result.actualGasCost.toString(),
          actualGasUsed: result.actualGasUsed.toString(),
          nonce: result.nonce.toString(),
          userOpHash: result.userOpHash,
        };

  try {
    await db
      .update(transactions)
      .set({
        confirmedAt: new Date(),
        transactionHash: result.transactionHash,
        confirmedAtBlockNumber: result.blockNumber.toString(),
        executionResult,
        errorMessage:
          result.onchainStatus === "REVERTED"
            ? result.revertData?.errorName
            : undefined,
      })
      // 4337 transactions always create a single transaction in the db, with batchIndex 0
      .where(
        and(eq(transactions.id, result.id), eq(transactions.batchIndex, 0))
      );
  } catch (err) {
    confirmLogger.error("Failed to write confirmed transaction to DB", err);
  }
}

registerCallback(externalBundlerConfirmHandler);
registerExternalBundlerAsyncConfirmCallback(externalBundlerConfirmHandler);
