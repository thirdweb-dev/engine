import type { Static } from "@sinclair/typebox";
import { StatusCodes } from "http-status-codes";
import {
  encode,
  type Address,
  type Hex,
  type PreparedTransaction,
} from "thirdweb";
import { resolvePromisedValue } from "thirdweb/utils";
import { createCustomError } from "../../../server/middleware/error";
import type { txOverridesWithValueSchema } from "../../../server/schemas/tx-overrides";
import { parseTransactionOverrides } from "../../../server/utils/transaction-overrides";
import { prettifyError } from "../error";
import { insertTransaction } from "./insert-transaction";
import type { InsertedTransaction } from "./types";

export type QueuedTransactionParams = {
  transaction: PreparedTransaction;
  fromAddress: Address;
  toAddress: Address | undefined;
  accountAddress: Address | undefined;
  accountFactoryAddress: Address | undefined;
  accountSalt: string | undefined;
  transactionMode: "sponsored" | undefined;
  txOverrides?: Static<
    typeof txOverridesWithValueSchema.properties.txOverrides
  >;
  idempotencyKey?: string;
  shouldSimulate?: boolean;
  /** For display purposes only. */
  functionName?: string;
  /** For display purposes only. */
  extension?: string;
};

/**
 * Encodes a transaction to generate data, and inserts it into the transaction queue using the insertTransaction()
 *
 * Note:
 *  - functionName must be provided to populate the functionName field in the queued transaction
 *  - value and chain details are resolved from the transaction
 */
export async function queueTransaction(args: QueuedTransactionParams) {
  const {
    transaction,
    fromAddress,
    toAddress,
    accountAddress,
    accountFactoryAddress,
    accountSalt,
    txOverrides,
    idempotencyKey,
    shouldSimulate,
    functionName,
    extension,
    transactionMode,
  } = args;

  let data: Hex;
  try {
    data = await encode(transaction);
  } catch (e) {
    throw createCustomError(
      prettifyError(e),
      StatusCodes.BAD_REQUEST,
      "BAD_REQUEST",
    );
  }

  const insertedTransaction: InsertedTransaction = {
    chainId: transaction.chain.id,
    from: fromAddress,
    authorizationList: await resolvePromisedValue(
      transaction.authorizationList,
    ),
    to: toAddress,
    data,
    value: await resolvePromisedValue(transaction.value),
    functionName,
    extension,
    transactionMode,
    ...parseTransactionOverrides(txOverrides),
    ...(accountAddress
      ? {
          isUserOp: true,
          accountAddress: accountAddress,
          signerAddress: fromAddress,
          target: toAddress,
          accountFactoryAddress,
          accountSalt,
        }
      : { isUserOp: false }),
  };

  return insertTransaction({
    insertedTransaction,
    shouldSimulate,
    idempotencyKey,
  });
}
