import { Knex } from 'knex';
import { TransactionStatusSchema } from '../../schemas/transaction/status'
import { TransactionSchema } from '../sharedApiSchemas';

export const insertTransactionData = async (knex: Knex, insertObject: TransactionSchema, request: any) : Promise<boolean> => {
  try{
    await knex('transactions').insert(insertObject);
    return true;
  } catch (error) {
    request.log.error('Error while inserting into tx table', error);
    return false;
  }
};

export const findTxDetailsWithQueueId = async (knex: Knex, queueId: string, request: any) : Promise<TransactionStatusSchema> => {
  try{
    const data = await knex('transactions')
      .where('identifier', queueId)
      .first();

    return data;
  } catch (error) {
    request.log.error('Error while inserting into tx table', error);
    return {} as TransactionStatusSchema;
  }
};
