import { SmartWallet } from "@thirdweb-dev/wallets";
import { getSDK } from "../../../core/sdk/sdk";
import { createWalletDetails } from "../../../src/db/wallets/createWalletDetails";
import { WalletType } from "../../../src/schema/wallet";
import { env } from "../../../src/utils/env";

interface CreateSmartWalletParams {
  chainId: number;
  walletAddress: string;
}

export const createSmartWallet = async ({
  chainId,
  walletAddress,
}: CreateSmartWalletParams): Promise<string> => {
  if (!env.SMART_WALLET_FACTORY_ADDRESS) {
    throw new Error(`Server was not configured for smart wallet creation.`);
  }

  const sdk = await getSDK(chainId.toString(), walletAddress);

  const smartWallet = new SmartWallet({
    chain: chainId,
    factoryAddress: env.SMART_WALLET_FACTORY_ADDRESS,
    secretKey: env.THIRDWEB_API_SECRET_KEY,
    gasless: true,
  });
  await smartWallet.connect({
    personalWallet: {
      async getSigner() {
        return sdk.getSigner()!;
      },
    },
  });

  const smartWalletAddress = await smartWallet.getAddress();

  // TODO: Need to specify which personal wallet was connected
  await createWalletDetails({
    type: WalletType.smartWallet,
    address: smartWalletAddress,
  });

  return smartWalletAddress;
};
