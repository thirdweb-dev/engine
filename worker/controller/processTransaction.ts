import { FastifyInstance } from 'fastify';
import { connectToDB } from "../helpers/database/dbConnect";
import { getEnv } from '../helpers/loadEnv';
import { getWalletNonce } from '../services/blockchain';
import { getWalletDetails } from '../services/dbOperations';
import { getSDK } from '../helpers';

const MIN_TRANSACTION_TO_PROCESS = parseInt(getEnv('MIN_TRANSACTION_TO_PROCESS'), 10) ?? 1;

export const processTransaction = async (server: FastifyInstance) : Promise<void> => {
    try {
        // Connect to the DB
        const knex = await connectToDB(server);
        
        const data = await knex('transactions')
            .where('txProcessed', false)
            .where('txMined', false)
            .where('txErrored', false)
            .limit(MIN_TRANSACTION_TO_PROCESS);
        
        if (data.length < MIN_TRANSACTION_TO_PROCESS){
            server.log.warn(`Number of transactions to process less than Minimum Transactions to Process: ${MIN_TRANSACTION_TO_PROCESS}`);
            server.log.warn(`Waiting for more transactions requests to start processing`);
        }

        data.forEach(async (tx: any) => {
            server.log.info(`Processing Transaction: ${tx.identifier}`);
            const walletData = await getWalletDetails(tx.walletAddress, tx.chainId, knex);
            const sdk = await getSDK(tx.chainId);
            const contract = await sdk.getContract(tx.contractAddress);
            switch (tx.extension) {
                case 'non-extension':
                    
                    break;
                case 'erc20':
                    break;
                case 'erc1155':
                    break;
                case 'erc721':
                    break;
            }

        });

    } catch (error) {
        server.log.error(error);
    }
};