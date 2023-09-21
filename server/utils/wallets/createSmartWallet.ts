import { env } from "../../../src/utils/env";
import { getSmartWallet } from "./getSmartWallet";

interface CreateSmartWalletParams {
  chainId: number;
  signerAddress: string;
}

export const createSmartWallet = async ({
  chainId,
  signerAddress,
}: CreateSmartWalletParams): Promise<string> => {
  if (!env.SMART_WALLET_FACTORY_ADDRESS) {
    throw new Error(`Server was not configured for smart wallet creation.`);
  }

  const smartWallet = await getSmartWallet({
    chainId,
    signerAddress,
  });

  const smartWalletAddress = await smartWallet.getAddress();

  // TODO: Save smart wallet in it's own table. Do we store deployer address?

  return smartWalletAddress;
};
