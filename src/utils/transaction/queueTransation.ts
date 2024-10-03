import type { Static } from "@sinclair/typebox";
import { StatusCodes } from "http-status-codes";
import {
  encode,
  type Address,
  type Hex,
  type PreparedTransaction,
} from "thirdweb";
import { stringify } from "thirdweb/utils";
import { createCustomError } from "../../server/middleware/error";
import type { txOverridesWithValueSchema } from "../../server/schemas/txOverrides";
import { parseTransactionOverrides } from "../../server/utils/transactionOverrides";
import { insertTransaction } from "./insertTransaction";
import type { InsertedTransaction } from "./types";

export type QueuedTransactionParams = {
  transaction: PreparedTransaction;
  fromAddress: Address;
  toAddress: Address | undefined;
  accountAddress: Address | undefined;
  accountFactoryAddress: Address | undefined;
  txOverrides?: Static<
    typeof txOverridesWithValueSchema.properties.txOverrides
  >;
  idempotencyKey?: string;
  shouldSimulate?: boolean;
};

export async function queueTransaction(args: QueuedTransactionParams) {
  const {
    transaction,
    fromAddress,
    toAddress,
    accountAddress,
    accountFactoryAddress,
    txOverrides,
    idempotencyKey,
    shouldSimulate,
  } = args;

  let data: Hex;
  try {
    data = await encode(transaction);
  } catch (e) {
    throw createCustomError(
      stringify(e),
      StatusCodes.BAD_REQUEST,
      "BAD_REQUEST",
    );
  }

  const insertedTransaction: InsertedTransaction = {
    chainId: transaction.chain.id,
    from: fromAddress,
    to: toAddress,
    data,

    ...parseTransactionOverrides(txOverrides),

    ...(accountAddress
      ? {
          isUserOp: true,
          accountAddress: accountAddress,
          signerAddress: fromAddress,
          target: toAddress,
          accountFactoryAddress,
        }
      : { isUserOp: false }),
  };

  return insertTransaction({
    insertedTransaction,
    shouldSimulate,
    idempotencyKey,
  });
}
