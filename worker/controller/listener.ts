import { FastifyInstance } from 'fastify';
import { connectToDB } from "../../core/helpers";
import { processTransaction } from './processTransaction';

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
            await processTransaction(server);
        });
    
        connection.on('end', () => {
            server.log.info(`Connection database ended`);
        });

        connection.on('error', (err: any) => {
            console.error(err);
        });
        
        knex.client.releaseConnection(connection);
    } catch (error) {
      server.log.error(`Error in notification listener: ${error}`);
      throw error;
    }
};