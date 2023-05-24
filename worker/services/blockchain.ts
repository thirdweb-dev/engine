import { getSDK } from "../helpers";

export const getWalletNonce = async (walletAddress: string, chainId: string) => {
    const sdk = await getSDK(chainId);
    // const nonce = await sdk.(walletAddress);
    // return nonce;
};