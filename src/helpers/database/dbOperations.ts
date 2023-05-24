import { Knex } from 'knex';
import { TransactionSchema } from '../sharedApiSchemas';
import { createCustomError } from '../customError';
import { StatusCodes } from 'http-status-codes';

interface TransactionStatusSchema {
  txProcessed: boolean;
  txSubmitted: boolean;
  txErrored: boolean;
  txMined: boolean;
}

export const insertTransactionData = async (knex: Knex, insertObject: TransactionSchema, request: any) : Promise<void> => {
  try{
    await knex('transactions').insert(insertObject);
  } catch (error: any) {
    const customError = createCustomError(error.message, StatusCodes.INTERNAL_SERVER_ERROR, 'INTERNAL_SERVER_ERROR');
    throw customError;
  }
};

export const findTxDetailsWithQueueId = async (knex: Knex, queueId: string, request: any) : Promise<TransactionStatusSchema> => {
  try{
    const data = await knex('transactions')
      .where('identifier', queueId)
      .first();

    return data;
  } catch (error: any) {
    const customError = createCustomError(error.message, StatusCodes.INTERNAL_SERVER_ERROR, 'INTERNAL_SERVER_ERROR');
    throw customError;
  }
};
