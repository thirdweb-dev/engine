import { LocalWallet } from "@thirdweb-dev/wallets";
import { Wallet } from "ethers";
import { getChainMetadata } from "thirdweb/chains";
import { type Account, privateKeyToAccount } from "thirdweb/wallets";
import { getChain } from "../../../shared/utils/chain";
import { env } from "../../../shared/utils/env";
import { thirdwebClient } from "../../../shared/utils/sdk";
import { badChainError } from "../../middleware/error";
import { LocalFileStorage } from "../storage/local-storage";

interface GetLocalWalletParams {
  chainId: number;
  walletAddress: string;
}

/**
 * @deprecated
 * DEPRECATED: Use getLocalWalletAccount instead
 */
export const getLocalWallet = async ({
  chainId,
  walletAddress,
}: GetLocalWalletParams) => {
  const chainV5 = await getChain(chainId);
  const chain = await getChainMetadata(chainV5);
  if (!chain) {
    throw badChainError(chainId);
  }

  // TODO: Is chain necessary?
  const wallet = new LocalWallet({ chain });
  await wallet.load({
    strategy: "encryptedJson",
    password: env.ENCRYPTION_PASSWORD,
    storage: new LocalFileStorage(walletAddress),
  });
  return wallet;
};

export async function encryptedJsonToAccount(
  json: string,
  encryptionPassword: string,
): Promise<Account> {
  const wallet = await Wallet.fromEncryptedJson(
    JSON.parse(json).data,
    encryptionPassword,
  );

  return privateKeyToAccount({
    client: thirdwebClient,
    privateKey: wallet.privateKey,
  });
}
