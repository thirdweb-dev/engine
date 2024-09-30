import type { Static } from "@sinclair/typebox";
import { StatusCodes } from "http-status-codes";
import {
  encode,
  type Address,
  type Hex,
  type PreparedTransaction,
} from "thirdweb";
import { createCustomError } from "../../server/middleware/error";
import type { txOverridesWithValueSchema } from "../../server/schemas/txOverrides";
import { maybeBigInt } from "../primitiveTypes";
import { insertTransaction } from "./insertTransaction";

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
    throw createCustomError(`${e}`, StatusCodes.BAD_REQUEST, "BAD_REQUEST");
  }

  const insertedTransaction = {
    chainId: transaction.chain.id,
    from: fromAddress,
    to: toAddress,
    data,
    value: maybeBigInt(txOverrides?.value),
    gas: maybeBigInt(txOverrides?.gas),
    maxFeePerGas: maybeBigInt(txOverrides?.maxFeePerGas),
    maxPriorityFeePerGas: maybeBigInt(txOverrides?.maxPriorityFeePerGas),
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
