import { FastifyInstance } from 'fastify';
import { connectToDB } from "../../core";
import { processTransaction } from './processTransaction';

let PROCESS_RUNNING = false;

export const startNotificationListener = async (server: FastifyInstance) : Promise<void> => {
  try {
    // Connect to the DB
    const knex = await connectToDB(server);
    server.log.info(`Starting notification listener`);
    // Acquire a connection
    const connection = await knex.client.acquireConnection();      
    connection.query('LISTEN new_transaction_data');

    connection.on('notification', async (msg: { channel: string; payload: string }) => {
      server.log.info(msg.payload);
      if (PROCESS_RUNNING) {
        server.log.info(`Process Requests already running`);
        return;
      }
      PROCESS_RUNNING = true;
      await processTransaction(server);
      server.log.info(`Process Requests Completed`);
      PROCESS_RUNNING = false;
    });

    connection.on('end', () => {
      server.log.info(`Connection database ended`);
    });

    connection.on('error', (err: any) => {
      server.log.error(err);
    });
    
    knex.client.releaseConnection(connection);
  } catch (error) {
    server.log.error(`Error in notification listener: ${error}`);
    throw error;
  }
};