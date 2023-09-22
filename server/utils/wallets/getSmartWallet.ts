import { EVMWallet, SmartWallet } from "@thirdweb-dev/wallets";
import { env } from "../../../src/utils/env";

interface GetSmartWalletParams {
  chainId: number;
  backendWallet: EVMWallet;
  accountAddress?: string;
}

export const getSmartWallet = async ({
  chainId,
  backendWallet,
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

  await smartWallet.connect({
    personalWallet: backendWallet,
    accountAddress,
  });

  return smartWallet;
};
