import { Knex } from "knex";
import { getChainBySlug } from "@thirdweb-dev/chains";
import { TransactionSchema } from "../sharedApiSchemas";
import { createCustomError } from "../customError";
import { StatusCodes } from "http-status-codes";
import { v4 as uuid } from "uuid";
import { connectWithDatabase } from "./dbConnect";
import { FastifyRequest } from "fastify";
import { Transaction, TransactionError } from "@thirdweb-dev/sdk";

interface TransactionStatusSchema {
  txProcessed: boolean;
  txSubmitted: boolean;
  txErrored: boolean;
  txMined: boolean;
}

export const queueTransaction = async (
  request: FastifyRequest,
  tx: Transaction<any>,
  chain_name_or_id: string,
  extension: string,
) => {
  // first simulate tx
  try {
    await tx.simulate();
  } catch (e) {
    const message = (e as TransactionError)?.reason || (e as any).message || e;
    throw new Error(`Transaction simulation failed with reason: ${message}`);
  }

  // get chain ID
  let chainId: string;
  if (isNaN(Number(chain_name_or_id))) {
    const chainData = getChainBySlug(chain_name_or_id);

    if (!chainData) {
        const error = createCustomError(`Chain with name/id ${chain_name_or_id} not found`, StatusCodes.NOT_FOUND, "NOT_FOUND");
        throw error;
    }

    chainId = chainData.chainId.toString();
  } else {
    chainId = chain_name_or_id;
  }

  // encode tx
  const encodedData = tx.encode();
  const txDataToInsert: TransactionSchema = {
    identifier: uuid(),
    walletAddress: (await tx.getSignerAddress()).toLowerCase(),
    contractAddress: tx.getTarget().toLowerCase(),
    chainId: chainId.toLowerCase(),
    extension: extension,
    rawFunctionName: tx.getMethod(),
    rawFunctionArgs: tx.getArgs().toString(),
    txProcessed: false,
    txErrored: false,
    txMined: false,
    txSubmitted: false,
    encodedInputData: encodedData,
  };

  // Insert to DB
  const dbInstance = await connectWithDatabase(request);
  await insertTransactionData(dbInstance, txDataToInsert, request);
  await dbInstance.destroy();

  // return queued id
  return txDataToInsert.identifier;
};

export const insertTransactionData = async (
  knex: Knex,
  insertObject: TransactionSchema,
  request: any,
): Promise<void> => {
  try {
    await knex("transactions").insert(insertObject);
  } catch (error: any) {
    const customError = createCustomError(
      error.message,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "INTERNAL_SERVER_ERROR",
    );
    throw customError;
  }
};

export const findTxDetailsWithQueueId = async (
  knex: Knex,
  queueId: string,
  request: any,
): Promise<TransactionSchema> => {
  try {
    const data = await knex("transactions")
      .where("identifier", queueId)
      .first();

    return data;
  } catch (error: any) {
    const customError = createCustomError(
      error.message,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "INTERNAL_SERVER_ERROR",
    );
    throw customError;
  }
};
