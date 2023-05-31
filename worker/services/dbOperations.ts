import { Knex } from 'knex';

export const getWalletDetails = async (walletAddress: string, chainId: string, database: Knex) : Promise<any> => {
    try {
        const walletDetails = await database('wallets')
            .select('*')
            .where({ walletAddress, chainId })
            .first();

        return walletDetails;
    } catch (error) {
        throw error;
    }    
};