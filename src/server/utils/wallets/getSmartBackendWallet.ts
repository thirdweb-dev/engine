import { Static } from "@sinclair/typebox";
import { getChainByChainIdAsync } from "@thirdweb-dev/chains";
import { Chain, LocalWallet } from "@thirdweb-dev/wallets";
import { getWalletDetails } from "../../../db/wallets/getWalletDetails";
import { getConfig } from "../../../utils/cache/getConfig";
import { networkResponseSchema } from "../../../utils/cache/getSdk";
import { env } from "../../../utils/env";
import { logger } from "../../../utils/logger";
import { LocalFileStorage } from "../storage/localStorage";
import { privateKeyToAccount, smartWallet } from "thirdweb/wallets";
import { createThirdwebClient, defineChain } from "thirdweb";

const client = createThirdwebClient({
  secretKey: env.THIRDWEB_API_SECRET_KEY,
});

interface GetLocalWalletParams {
  chainId: number;
  walletAddress: string;
}

export const getSmartBackendWallet = async ({
  chainId,
  walletAddress,
}: GetLocalWalletParams) => {
  let chain: Chain | undefined = undefined;
  const config = await getConfig();
  const CHAIN_OVERRIDES = config.chainOverrides;
  try {
    chain = await getChainByChainIdAsync(chainId);
  } catch (error) {}

  if (CHAIN_OVERRIDES) {
    const parsedChainOverrides = JSON.parse(CHAIN_OVERRIDES);
    const overrideChain = parsedChainOverrides.find(
      (chainData: Static<typeof networkResponseSchema>) =>
        chainData.chainId === chainId,
    );

    if (overrideChain) {
      chain = overrideChain;
    }
  }

  if (!chain) {
    throw new Error(
      `Invalid chain ${chainId}, please use a different value or provide Chain Override Data.`,
    );
  }

  let walletDetails = await getWalletDetails({
    address: walletAddress,
  });

  if (!walletDetails) {
    throw new Error(`Wallet with address ${walletAddress} not found.`);
  }

  const wallet = new LocalWallet();
  wallet.load({
    strategy: "encryptedJson",
    password: env.ENCRYPTION_PASSWORD,
    storage: new LocalFileStorage(walletAddress),
  });
  const pkey = await wallet.export({
    strategy: "privateKey",
    encryption: false,
  });

  const account = privateKeyToAccount({
    client,
    privateKey: pkey,
  });

  const smartAccount = smartWallet({ chain: defineChain(1), gasless: true });
  const sWallet = await smartAccount.connect({
    client,
    personalAccount: account,
  });
  return sWallet;

  /*  const wallet = new LocalWallet({ chain });*/

  /*// TODO: Remove this with next breaking change*/
  /*try {*/
  /*// First, try to load the wallet using the encryption password*/
  /*await wallet.load({*/
  /*strategy: "encryptedJson",*/
  /*password: env.ENCRYPTION_PASSWORD,*/
  /*storage: new LocalFileStorage(walletAddress),*/
  /*});*/
  /*} catch {*/
  /*throw new Error(*/
  /*`Failed to load wallet with address ${walletAddress} using encryption password. Please ensure the wallet is properly configured.`,*/
  /*);*/
  /*}*/

  /*logger.info(`Loaded wallet with address ${walletAddress}`);*/
  /*const account = privateKeyToAccount({ client, privateKey: pkey });*/
};
