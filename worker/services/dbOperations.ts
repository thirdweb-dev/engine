import { BigNumber, providers } from "ethers";
import { createCustomError, getEnv } from "../../core";
import { Knex } from "knex";

const TRANSACTIONS_TO_BATCH =
  parseInt(getEnv("TRANSACTIONS_TO_BATCH"), 10) ?? 10;

export const getWalletDetails = async (
  walletAddress: string,
  chainId: string,
  database: Knex,
  trx: Knex.Transaction,
): Promise<any> => {
  try {
    const walletDetails = await database("wallets")
      .select("*")
      .where({ walletAddress, chainId })
      .first()
      .forUpdate()
      .transacting(trx);

    return walletDetails;
  } catch (error) {
    throw error;
  }
};

enum TransactionState {
  submitted = "submitted",
  processed = "processed",
  errored = "errored",
}

export const getTransactionsToProcess = async (
  database: Knex,
  trx: Knex.Transaction,
): Promise<number> => {
  return await database
    .raw(
      `select *, ROW_NUMBER()
      OVER (PARTITION BY "walletAddress", "chainId" ORDER BY "createdTimestamp" ASC) AS rownum
      FROM "transactions"
      WHERE "txProcessed" = false AND "txMined" = false AND "txErrored" = false
      ORDER BY "createdTimestamp" ASC
      LIMIT ${TRANSACTIONS_TO_BATCH}`,
    )
    .transacting(trx);
};

export const updateTransactionState = async (
  database: Knex,
  identifier: string,
  state: string,
  trx: Knex.Transaction,
  txResponse?: providers.TransactionResponse | undefined,
): Promise<any> => {
  try {
    let updateData = {};
    if (state == TransactionState.processed) {
      updateData = {
        txProcessed: true,
        txProcessedTimestamp: new Date(),
        updatedTimestamp: new Date(),
      };
    } else if (state == TransactionState.submitted) {
      updateData = {
        txSubmitted: true,
        txSubmittedTimestamp: new Date(),
        updatedTimestamp: new Date(),
        submittedTxNonce: txResponse?.nonce,
        txHash: txResponse?.hash,
        txType: txResponse?.type,
        gasPrice: txResponse?.gasPrice?.toString(),
        gasLimit: txResponse?.gasLimit?.toString(),
        maxPriorityFeePerGas: txResponse?.maxPriorityFeePerGas?.toString(),
        maxFeePerGas: txResponse?.maxFeePerGas?.toString(),
      };
    } else if (state == TransactionState.errored) {
      updateData = {
        txErrored: true,
        txProcessed: true,
        txProcessedTimestamp: new Date(),
        updatedTimestamp: new Date(),
      };
    } else {
      const error = createCustomError(
        `Invalid transaction state: ${state}`,
        500,
        "INVALID_TRANSACTION_STATE",
      );
      throw error;
    }

    const updatedTransaction = await database("transactions")
      .update(updateData)
      .where({ identifier })
      .transacting(trx);

    return updatedTransaction;
  } catch (error) {
    throw error;
  }
};

export const updateWalletNonceValue = async (
  lastUsedNonce: BigNumber,
  blockchainNonce: BigNumber,
  walletAddress: string,
  chainId: string,
  database: Knex,
  trx: Knex.Transaction,
): Promise<any> => {
  try {
    const updatedWallet = await database("wallets")
      .update({
        lastUsedNonce: +lastUsedNonce,
        blockchainNonce: +blockchainNonce,
      })
      .where("walletAddress", walletAddress)
      .where("chainId", chainId)
      .transacting(trx);

    return updatedWallet;
  } catch (error) {
    throw error;
  }
};
