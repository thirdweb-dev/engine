import { getChainByChainId } from "@thirdweb-dev/chains";
import { LocalWallet } from "@thirdweb-dev/wallets";
import { LocalFileStorage } from "../../../core";
import { env } from "../../../src/utils/env";

interface GetLocalWalletParams {
  chainId: number;
  walletAddress: string;
}

export const getLocalWallet = async ({
  chainId,
  walletAddress,
}: GetLocalWalletParams) => {
  const chain = getChainByChainId(chainId);
  const wallet = new LocalWallet({ chain });
  await wallet.load({
    strategy: "encryptedJson",
    password: env.THIRDWEB_API_SECRET_KEY,
    storage: new LocalFileStorage(walletAddress),
  });

  return wallet;
};
