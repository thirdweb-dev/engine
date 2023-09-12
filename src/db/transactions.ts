import { DeployTransaction, Transaction } from "@thirdweb-dev/sdk";
import { prisma } from "./client";
// TODO: Don't use BigNumber here - SDK should handle this
import { BigNumber } from "ethers";
import { env } from "../../core";
import { TransactionStatusEnum } from "../../server/schemas/transaction";

export const getTxById = async (queueId: string) => {
  const tx = await prisma.transactions.findUnique({
    where: {
      id: queueId,
    },
  });

  if (!tx) {
    // TODO: Defined error types
    throw new Error(`Transaction with ID ${queueId} not found!`);
  }

  return tx;
};

export const getQueuedTxs = async (): Promise<Transaction[]> => {
  // TODO: Don't use env var for transactions to batch
  return prisma.$queryRaw`
SELECT
  *
FROM
  "transactions"
WHERE
  "processedAt" IS NULL
  AND "sentAt" IS NULL
  AND "minedAt" IS NULL
ORDER BY
  "queuedAt"
LIMIT
  ${env.TRANSACTIONS_TO_BATCH}
FOR UPDATE SKIP LOCKED
  `;
};

export const getSentTxs = async () => {
  return prisma.transactions.findMany({
    where: {
      processedAt: {
        not: null,
      },
      sentAt: {
        not: null,
      },
      transactionHash: {
        not: null,
      },
      minedAt: null,
      errorMessage: null,
      retryCount: {
        // TODO: What should the max retries be here?
        lt: 3,
      },
    },
    orderBy: [
      {
        sentAt: "asc",
      },
    ],
    // TODO: Should this be coming from env?
    take: env.MIN_TX_TO_CHECK_FOR_MINED_STATUS,
  });
};

export const getAllTxs = async (
  page: number,
  limit: number,
  // TODO: Replace this...
  filter?: TransactionStatusEnum,
  contractExtensions?: string[],
) => {
  let filterBy:
    | "queuedAt"
    | "sentAt"
    | "processedAt"
    | "minedAt"
    | "errorMessage"
    | undefined;

  if (filter === TransactionStatusEnum.Queued) {
    filterBy = "queuedAt";
  } else if (filter === TransactionStatusEnum.Submitted) {
    filterBy = "sentAt";
  } else if (filter === TransactionStatusEnum.Processed) {
    filterBy = "processedAt";
  } else if (filter === TransactionStatusEnum.Mined) {
    filterBy = "minedAt";
  } else if (filter === TransactionStatusEnum.Errored) {
    filterBy = "errorMessage";
  }

  return prisma.transactions.findMany({
    where: {
      ...(filterBy
        ? {
            [filterBy]: {
              not: null,
            },
          }
        : {}),
      ...(contractExtensions
        ? {
            contractExtension: {
              in: contractExtensions,
            },
          }
        : {}),
    },
    orderBy: [
      {
        queuedAt: "desc",
      },
    ],
    skip: (page - 1) * limit,
    take: limit,
  });
};

// TODO: Simulation should be done before this function...
export const queueTx = async (
  chainId: number,
  tx: Transaction | DeployTransaction,
  // TODO: Clean up how extension is passed in
  contractExtension: string,
) => {
  // TODO: SDK should have a JSON.stringify() method.
  const fromAddress = (await tx.getSignerAddress()).toLowerCase();
  const toAddress = tx.getTarget().toLowerCase();
  const data = tx.encode();
  const functionName = tx.getMethod();
  const functionArgs = tx.getArgs().toString();
  const value = BigNumber.from(await tx.getValue()).toHexString();

  // TODO: Should we call this txId so it's easier to spell?
  const { id: queueId } = await prisma.transactions.create({
    data: {
      chainId,
      fromAddress,
      toAddress,
      data,
      value,
      functionName,
      functionArgs,
      contractExtension,
    },
  });

  return queueId;
};

// TODO: Switch all functions to object params
export const retryTx = async (
  queuedId: string,
  maxFeePerGas: string,
  maxPriorityFeePerGas: string,
) => {
  await prisma.transactions.update({
    where: {
      id: queuedId,
    },
    // TODO: Do these need to all be separate fields?
    data: {
      retryMaxFeePerGas: maxFeePerGas,
      retryMaxPriorityFeePerGas: maxPriorityFeePerGas,
    },
  });
};
