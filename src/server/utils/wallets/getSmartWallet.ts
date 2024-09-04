import { EVMWallet, SmartWallet } from "@thirdweb-dev/wallets";
import { getContract } from "../../../utils/cache/getContract";
import { env } from "../../../utils/env";
import { redis } from "../../../utils/redis/redis";

interface GetSmartWalletParams {
  chainId: number;
  backendWallet: EVMWallet;
  accountAddress: string;
}

export const getSmartWallet = async ({
  chainId,
  backendWallet,
  accountAddress,
}: GetSmartWalletParams) => {
  let factoryAddress: string = "";

  try {
    // Note: This is a temporary solution to use cached deployed address's factory address from create-account
    // This is needed due to a potential race condition of submitting a transaction immediately after creating an account that is not yet mined onchain
    factoryAddress =
      (await redis.get(
        `account-factory:${chainId}:${accountAddress.toLowerCase()}`,
      )) || "";
  } catch {}

  if (!factoryAddress) {
    try {
      const contract = await getContract({
        chainId,
        contractAddress: accountAddress,
      });
      factoryAddress = await contract.call("factory");
    } catch {
      throw new Error(
        `Failed to find factory address for account '${accountAddress}' on chain '${chainId}'`,
      );
    }
  }

  const smartWallet = new SmartWallet({
    chain: chainId,
    factoryAddress,
    secretKey: env.THIRDWEB_API_SECRET_KEY,
    gasless: true,
  });

  await smartWallet.connect({
    personalWallet: backendWallet,
    accountAddress,
  });

  return smartWallet;
};
