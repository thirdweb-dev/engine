import { EVMWallet, SmartWallet } from "@thirdweb-dev/wallets";
import { env } from "../../../src/utils/env";
import { getContract } from "../cache/getContract";

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
  let factoryAddress: string;
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
