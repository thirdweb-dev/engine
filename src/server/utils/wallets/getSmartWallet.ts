import { SmartWallet, type EVMWallet } from "@thirdweb-dev/wallets";
import { getContract } from "../../../utils/cache/getContract";
import { env } from "../../../utils/env";
import { redis } from "../../../utils/redis/redis";

interface GetSmartWalletParams {
  chainId: number;
  backendWallet: EVMWallet;
  accountAddress: string;
  factoryAddress?: string;
  entrypointAddress?: string;
}

/**
 * @deprecated
 * DEPRECATED: Use `getSmartWalletV5` instead
 */
export const getSmartWallet = async ({
  chainId,
  backendWallet,
  accountAddress,
  factoryAddress,
  entrypointAddress,
}: GetSmartWalletParams) => {
  let resolvedFactoryAddress: string | undefined = factoryAddress;

  if (!resolvedFactoryAddress) {
    try {
      // Note: This is a temporary solution to use cached deployed address's factory address from create-account
      // This is needed due to a potential race condition of submitting a transaction immediately after creating an account that is not yet mined onchain
      resolvedFactoryAddress =
        (await redis.get(`account-factory:${accountAddress.toLowerCase()}`)) ??
        undefined;
    } catch { /* empty */ }
  }

  if (!resolvedFactoryAddress) {
    try {
      const contract = await getContract({
        chainId,
        contractAddress: accountAddress,
      });
      resolvedFactoryAddress = await contract.call("factory");
    } catch { /* empty */ }
  }

  if (!resolvedFactoryAddress) {
    throw new Error(
      `Failed to find factory address for account '${accountAddress}' on chain '${chainId}'`,
    );
  }

  const smartWallet = new SmartWallet({
    chain: chainId,
    factoryAddress: resolvedFactoryAddress,
    entryPointAddress: entrypointAddress,
    secretKey: env.THIRDWEB_API_SECRET_KEY,
    gasless: true,
  });

  await smartWallet.connect({
    personalWallet: backendWallet,
    accountAddress,
  });

  return smartWallet;
};
