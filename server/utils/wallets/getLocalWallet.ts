import { Chain } from "@thirdweb-dev/chains";
import { LocalWallet } from "@thirdweb-dev/wallets";
import { LocalFileStorage } from "../../../core";
import { env } from "../../../core/env";

interface GetLocalWalletParams {
  chain: Chain;
  walletAddress: string;
}

export const getLocalWallet = async ({
  chain,
  walletAddress,
}: GetLocalWalletParams) => {
  const wallet = new LocalWallet({ chain });
  await wallet.load({
    strategy: "encryptedJson",
    password: env.THIRDWEB_API_SECRET_KEY,
    storage: new LocalFileStorage(walletAddress),
  });

  return wallet;
};
