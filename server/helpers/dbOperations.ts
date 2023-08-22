import { Static } from "@sinclair/typebox";
import { getChainByChainId, getChainBySlug } from "@thirdweb-dev/chains";
import {
  DeployTransaction,
  Transaction,
  TransactionError,
} from "@thirdweb-dev/sdk";
import { BigNumber } from "ethers";
import { FastifyInstance, FastifyRequest } from "fastify";
import { StatusCodes } from "http-status-codes";
import { Knex } from "knex";
import { v4 as uuid } from "uuid";
import { connectWithDatabase, getSDK } from "../../core";
import { insertIntoWallets } from "../../core/database/dbOperation";
import { createCustomError } from "../../core/error/customError";
import { WalletData } from "../../core/interfaces";
import { getWalletNonce } from "../../core/services/blockchain";
import {
  TransactionSchema,
  TransactionStatusEnum,
  transactionResponseSchema,
} from "../schemas/transaction";

const checkNetworkInWalletDB = async (
  database: Knex,
  chainId: string,
  walletAddress: string,
): Promise<WalletData> => {
  try {
    const walletData = await database("wallets")
      .where("chainId", chainId)
      .where("walletAddress", walletAddress.toLowerCase())
      .first();

    return walletData;
  } catch (error) {
    throw error;
  }
};

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

  let chainData;

  if (isNaN(Number(network))) {
    chainData = getChainBySlug(network);
    if (!chainData) {
      const error = createCustomError(
        `Chain with name/id ${network} not found`,
        StatusCodes.NOT_FOUND,
        "NOT_FOUND",
      );
      throw error;
    }
  } else {
    chainData = getChainByChainId(parseInt(network, 10));
  }

  const chainId = chainData.chainId.toString();
  const dbInstance = await connectWithDatabase();
  const walletAddress = await tx.getSignerAddress();
  const checkForNetworkData = await checkNetworkInWalletDB(
    dbInstance,
    chainId,
    walletAddress.toLowerCase(),
  );

  if (!checkForNetworkData) {
    const sdk = await getSDK(chainId);
    const walletNonce = await getWalletNonce(
      walletAddress.toLowerCase(),
      sdk.getProvider(),
    );

    const walletData = {
      walletAddress: walletAddress.toLowerCase(),
      chainId: chainId.toLowerCase(),
      blockchainNonce: BigNumber.from(walletNonce ?? 0).toNumber(),
      lastSyncedTimestamp: new Date(),
      lastUsedNonce: -1,
      walletType: chainData.slug,
    };

    await insertIntoWallets(walletData, dbInstance);
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
  request: FastifyRequest | FastifyInstance,
): Promise<Static<typeof transactionResponseSchema>> => {
  try {
    const dbInstance = await connectWithDatabase();
    const data = await dbInstance("transactions")
      .where("identifier", queueId)
      .first();
    await dbInstance.destroy();

    const transformedData = transformData([data]);
    return transformedData[0];
  } catch (error: any) {
    request.log.error(error);
    const customError = createCustomError(
      `Error while fetching transaction details for identifier: ${queueId} from Table.`,
      StatusCodes.NOT_FOUND,
      "TX_QUEUE_ID_NOT_FOUND",
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
    const dbInstance = await connectWithDatabase();
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
    if (!row) {
      return {};
    }
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
  page: number,
  limit: number,
  sort?: string,
  sort_order?: string,
  filter?: string,
): Promise<Static<typeof transactionResponseSchema>[]> => {
  try {
    const dbInstance = await connectWithDatabase();
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
