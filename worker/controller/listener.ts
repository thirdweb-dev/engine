import { FastifyInstance } from 'fastify';
import { connectToDB } from "../helpers/database/dbConnect";
import { processTransaction } from './processTransaction';

// const reconnectClient = async (knex: any, client: Knex.Client) : Promise<void> => {
//     // const fn = setInterval(async () => {
//       try {
//         const connection = await knex.client.acquireConnection();
//         // doConnectionSetupStuff(connection, knex, client);
//         // clearInterval(fn);
        
//         console.log('connected to DB');
//       } catch (e) {
//         console.error(e);
//       }
//     }, 3000);
// };

export const startNotificationListener = async (server: FastifyInstance) : Promise<void> => {
    try {
        // Connect to the DB
        const knex = await connectToDB(server);

        // Acquire a connection
        const connection = await knex.client.acquireConnection();      
        connection.query('LISTEN new_transaction_data');
  
        connection.on('notification', async (msg: { channel: string; payload: string }) => {
            server.log.info(msg.payload);
            await processTransaction(server);
        });
    
        connection.on('end', () => {
            server.log.info(`Connection database ended`);
        //   reconnectClient(knex, client);
        });

        connection.on('error', (err: any) => {
            console.error(err);
        });
        
        // knex.client.releaseConnection(connection);
    } catch (error) {
        server.log.error(error);
    }
};