import type { Static } from "@sinclair/typebox";
import { StatusCodes } from "http-status-codes";
import {
  type Address,
  type Hex,
  type PreparedTransaction,
  encode,
} from "thirdweb";
import { createCustomError } from "../../server/middleware/error";
import type { txOverridesWithValueSchema } from "../../server/schemas/txOverrides";
import { parseTransactionOverrides } from "../../server/utils/transactionOverrides";
import { prettifyError } from "../error";
import { insertTransaction } from "./insertTransaction";
import type { InsertedTransaction } from "./types";

export type QueuedTransactionParams = {
  transaction: PreparedTransaction;
  fromAddress: Address;
  toAddress: Address | undefined;
  accountAddress: Address | undefined;
  accountFactoryAddress: Address | undefined;
  accountSalt: string | undefined;
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
    accountSalt,
    txOverrides,
    idempotencyKey,
    shouldSimulate,
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
