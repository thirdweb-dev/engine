import { Knex } from "knex";
import { getChainBySlug } from "@thirdweb-dev/chains";
import { createCustomError } from "../../core/error/customError";
import { StatusCodes } from "http-status-codes";
import { v4 as uuid } from "uuid";
import { connectWithDatabase } from "../../core";
import { FastifyRequest } from "fastify";
import {
  DeployTransaction,
  Transaction,
  TransactionError,
} from "@thirdweb-dev/sdk";
import {
  TransactionStatusEnum,
  TransactionSchema,
  transactionResponseSchema,
} from "../schemas/transaction";
import { Static } from "@sinclair/typebox";

export const queueTransaction = async (
  request: FastifyRequest,
  tx: Transaction<any> | DeployTransaction,
  network: string,
  extension: string,
  deployedContractAddress?: string,
  contractType?: string,
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
  if (isNaN(Number(network))) {
    const chainData = getChainBySlug(network);

    if (!chainData) {
      const error = createCustomError(
        `Chain with name/id ${network} not found`,
        StatusCodes.NOT_FOUND,
        "NOT_FOUND",
      );
      throw error;
    }

    chainId = chainData.chainId.toString();
  } else {
    chainId = network;
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
    deployedContractAddress,
    contractType,
  };

  if (!txDataToInsert.identifier) {
    const error = createCustomError(
      "Transaction identifier not found",
      StatusCodes.INTERNAL_SERVER_ERROR,
      "INTERNAL_SERVER_ERROR",
    );
    throw error;
  }

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
  request: FastifyRequest,
): Promise<void> => {
  try {
    await knex("transactions").insert(insertObject);
  } catch (error: any) {
    const customError = createCustomError(
      error.message.split(" - ")[1],
      StatusCodes.INTERNAL_SERVER_ERROR,
      "INTERNAL_SERVER_ERROR",
    );
    throw customError;
  }
};

export const findTxDetailsWithQueueId = async (
  queueId: string,
  request: FastifyRequest,
): Promise<Static<typeof transactionResponseSchema>> => {
  try {
    const dbInstance = await connectWithDatabase(request);
    const data = await dbInstance("transactions")
      .where("identifier", queueId)
      .first();
    await dbInstance.destroy();

    const transformedData = transformData([data]);
    return transformedData[0];
  } catch (error: any) {
    const customError = createCustomError(
      `Error while fetching transaction details for identifier: ${queueId} from Table.`,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "INTERNAL_SERVER_ERROR",
    );
    throw customError;
  }
};

export const getAllTxFromDB = async (
  request: FastifyRequest,
  page: number,
  limit: number,
  sort?: string,
  sort_order?: string,
  filter?: string,
): Promise<Static<typeof transactionResponseSchema>[]> => {
  try {
    const dbInstance = await connectWithDatabase(request);
    const data = (await dbInstance("transactions")
      .where((builder) => {
        if (filter === TransactionStatusEnum.Submitted) {
          builder.where("txSubmitted", true);
        } else if (filter === TransactionStatusEnum.Processed) {
          builder.where("txProcessed", true);
        } else if (filter === TransactionStatusEnum.Mined) {
          builder.where("txMined", true);
        } else if (filter === TransactionStatusEnum.Errored) {
          builder.where("txErrored", true);
        } else if (filter === TransactionStatusEnum.Queued) {
          builder.where("txSubmitted", false);
          builder.where("txProcessed", false);
          builder.where("txMined", false);
          builder.where("txErrored", false);
        }
      })
      .orderBy(sort || "createdTimestamp", sort_order || "asc")
      .limit(limit)
      .offset((page - 1) * limit)) as TransactionSchema[];
    await dbInstance.destroy();

    const transformedData = transformData(data);
    return transformedData;
  } catch (error: any) {
    const customError = createCustomError(
      "Error while fetching all transaction requests from Table.",
      StatusCodes.INTERNAL_SERVER_ERROR,
      "INTERNAL_SERVER_ERROR",
    );
    throw customError;
  }
};

const transformData = (
  txResult: TransactionSchema[],
): Static<typeof transactionResponseSchema>[] => {
  const transformedData = txResult.map((row) => {
    let status = "";
    if (row.txMined) {
      status = TransactionStatusEnum.Mined;
    } else if (row.txSubmitted) {
      status = TransactionStatusEnum.Submitted;
    } else if (row.txErrored) {
      status = TransactionStatusEnum.Errored;
    } else if (row.txProcessed) {
      status = TransactionStatusEnum.Processed;
    } else {
      status = TransactionStatusEnum.Queued;
    }
    let queueId = row.identifier;
    let functionName = row.rawFunctionName;
    let functionArgs = row.rawFunctionArgs;
    delete row.identifier;
    delete row.rawFunctionName;
    delete row.rawFunctionArgs;
    return { ...row, status, queueId, functionName, functionArgs };
  });

  return transformedData;
};

export const getAllDeployedContractTxFromDB = async (
  request: FastifyRequest,
  page: number,
  limit: number,
  sort?: string,
  sort_order?: string,
  filter?: string,
): Promise<Static<typeof transactionResponseSchema>[]> => {
  try {
    const dbInstance = await connectWithDatabase(request);
    const data = (await dbInstance("transactions")
      .where((builder) => {
        if (filter === TransactionStatusEnum.Submitted) {
          builder.where("txSubmitted", true);
        } else if (filter === TransactionStatusEnum.Processed) {
          builder.where("txProcessed", true);
        } else if (filter === TransactionStatusEnum.Mined) {
          builder.where("txMined", true);
        } else if (filter === TransactionStatusEnum.Errored) {
          builder.where("txErrored", true);
        } else if (filter === TransactionStatusEnum.Queued) {
          builder.where("txSubmitted", false);
          builder.where("txProcessed", false);
          builder.where("txMined", false);
          builder.where("txErrored", false);
        }
        builder.whereIn("extension", [
          "deployer_prebuilt",
          "deployer_published",
        ]);
        builder.whereNotNull("deployedContractAddress");
      })
      .orderBy(sort || "createdTimestamp", sort_order || "asc")
      .limit(limit)
      .offset((page - 1) * limit)) as TransactionSchema[];
    await dbInstance.destroy();

    const transformedData = transformData(data);
    return transformedData;
  } catch (error: any) {
    const customError = createCustomError(
      "Error while fetching all transaction requests from Table.",
      StatusCodes.INTERNAL_SERVER_ERROR,
      "INTERNAL_SERVER_ERROR",
    );
    throw customError;
  }
};
