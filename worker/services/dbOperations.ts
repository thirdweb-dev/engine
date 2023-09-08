import { BigNumber, providers } from "ethers";
import { Knex } from "knex";
import { createCustomError, env } from "../../core";
import { TransactionSchema } from "../../server/schemas/transaction";

const TRANSACTIONS_TO_BATCH = env.TRANSACTIONS_TO_BATCH;
const MIN_TX_TO_CHECK_FOR_MINED_STATUS = env.MIN_TX_TO_CHECK_FOR_MINED_STATUS;

export const getWalletDetailsWithTransaction = async (
  walletAddress: string,
  chainId: string,
  database: Knex,
  trx: Knex.Transaction,
): Promise<any> => {
  try {
    const walletDetails = await database("wallets")
      .select("*")
      .where({ walletAddress: walletAddress.toLowerCase(), chainId })
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
  mined = "mined",
}

export const getTransactionsToProcess = async (
  database: Knex,
  trx: Knex.Transaction,
): Promise<any> => {
  return await database
    .raw(
      `select * FROM "transactions"
      WHERE "txProcessed" = false AND "txMined" = false AND "txErrored" = false
      ORDER BY "createdTimestamp" ASC
      LIMIT ${TRANSACTIONS_TO_BATCH}
      FOR UPDATE SKIP LOCKED`,
    )
    .transacting(trx);
};

export const updateTransactionState = async (
  database: Knex,
  identifier: string,
  state: string,
  trx: Knex.Transaction,
  txResponse?: providers.TransactionResponse | undefined,
  errorMessage?: string | undefined,
  extraData?: TransactionSchema,
): Promise<any> => {
  try {
    let updateData = {};
    if (state == TransactionState.mined) {
      updateData = {
        txMined: true,
        updatedTimestamp: new Date(),
        ...extraData,
      };
    } else if (state == TransactionState.processed) {
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
        errorMessage,
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
      .where("walletAddress", walletAddress.toLowerCase())
      .where("chainId", chainId)
      .transacting(trx);

    return updatedWallet;
  } catch (error) {
    throw error;
  }
};

export const checkTableForPrimaryKey = async (knex: Knex): Promise<boolean> => {
  const result = await knex.raw(
    `
      SELECT COUNT(*) >= 2 AS is_primary_key
      FROM pg_constraint con 
      JOIN pg_attribute a ON a.attnum = ANY(con.conkey)
      WHERE con.contype = 'p' 
      AND conrelid::regclass::text = ?
      AND a.attname IN ('walletAddress', 'chainId')
    `,
    ["wallets"],
  );

  return result.rows[0].is_primary_key;
};

export const getSubmittedTransactions = async (
  database: Knex,
  trx: Knex.Transaction,
): Promise<TransactionSchema[]> => {
  const data = await database.raw(
    `select * from transactions
    where "txProcessed" = true
    and "txSubmitted" = true
    and "txMined" = false
    and "txErrored" = false
    and "txHash" is not null
    order by "txSubmittedTimestamp" ASC
    limit ${MIN_TX_TO_CHECK_FOR_MINED_STATUS}
    for update skip locked`,
  );
  return data.rows;
};

export const getSubmittedTransactionsToRetry = async (
  database: Knex,
  trx: Knex.Transaction,
): Promise<TransactionSchema[]> => {
  const data = await database.raw(
    `select * from transactions
    where "txProcessed" = true
    and "txSubmitted" = true
    and "txMined" = false
    and "txErrored" = false
    and "txHash" is not null
    and "txSubmittedTimestamp" < now() - interval '10 minutes'
    order by "txSubmittedTimestamp" ASC
    limit ${MIN_TX_TO_CHECK_FOR_MINED_STATUS}
    for update skip locked`,
  );
  return data.rows;
};
