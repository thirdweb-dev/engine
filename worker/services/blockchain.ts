import { BigNumberish } from "ethers";
import { ethers } from "ethers";

export const getWalletNonce = async (walletAddress: string, chainId: string) : Promise<BigNumberish> => {
    try {
        const rpcURL = await getRPCURL(chainId);
        const customHttpProvider = new ethers.providers.JsonRpcProvider(rpcURL);
        console.log(`RPC URL: ${rpcURL}`);
        const txCount = await customHttpProvider.getTransactionCount(walletAddress, 'pending');
        console.debug(`Pending Tx Count: ${txCount}`);
        return txCount;
    } catch (error) {
        throw error;
    }
};

const getRPCURL = async (chainId: string) : Promise<string> => {
    return `https://${chainId}.rpc.thirdweb.com`;
};