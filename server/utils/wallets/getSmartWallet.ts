import { SmartWallet } from "@thirdweb-dev/wallets";
import { env } from "../../../src/utils/env";
import { getWallet } from "../cache/getWallet";

interface GetSmartWalletParams {
  chainId: number;
  signerAddress: string;
  accountAddress?: string;
}

export const getSmartWallet = async ({
  chainId,
  signerAddress,
  accountAddress,
}: GetSmartWalletParams) => {
  if (!env.SMART_WALLET_FACTORY_ADDRESS) {
    throw new Error(`Server was not configured for smart wallet creation.`);
  }

  const smartWallet = new SmartWallet({
    chain: chainId,
    factoryAddress: env.SMART_WALLET_FACTORY_ADDRESS,
    secretKey: env.THIRDWEB_API_SECRET_KEY,
    gasless: true,
  });

  const personalWallet = await getWallet({
    chainId,
    walletAddress: signerAddress,
  });
  await smartWallet.connect({
    personalWallet,
    accountAddress,
  });

  return smartWallet;
};
