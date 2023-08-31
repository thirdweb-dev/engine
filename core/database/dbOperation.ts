import { getChainBySlug } from "@thirdweb-dev/chains";
import { getSupportedChains } from "@thirdweb-dev/sdk";
import { BigNumber } from "ethers";
import { FastifyInstance } from "fastify";
import { Knex } from "knex";
import { getInstanceAdminWalletType, getWalletBackUpType } from "../helpers";
import { WalletData } from "../interfaces";
import { getSDK } from "../sdk/sdk";
import { getWalletNonce } from "../services/blockchain";
import { connectWithDatabase } from "./dbConnect";

interface WalletExtraData {
  awsKmsKeyId?: string;
  awsKmsArn?: string;
  walletType?: string;
}

export const insertIntoWallets = async (
  walletData: WalletData,
  database: Knex,
): Promise<number[]> => {
  return database("wallets")
    .insert(walletData)
    .onConflict(["walletAddress", "chainId"])
    .merge();
};

export const getWalletDetails = async (
  walletAddress: string,
  chainId: string,
  database?: Knex,
): Promise<any> => {
  try {
    let passedAsParameter = true;
    if (!database) {
      passedAsParameter = false;
      database = await connectWithDatabase();
    }
    const walletDetails = await database("wallets")
      .select("*")
      .where({ walletAddress: walletAddress.toLowerCase(), chainId })
      .orWhere({ walletAddress: walletAddress.toLowerCase(), slug: chainId })
      .first();

    if (!passedAsParameter) {
      await database.destroy();
    }
    return walletDetails;
  } catch (error) {
    throw error;
  }
};

export const addWalletToDB = async (
  chainId: string,
  walletAddress: string,
  slug: string,
  dbInstance: Knex,
): Promise<void> => {
  try {
    const sdk = await getSDK(chainId);
    const walletNonce = await getWalletNonce(
      walletAddress.toLowerCase(),
      sdk.getProvider(),
    );

    const walletData = {
      walletAddress: walletAddress.toLowerCase(),
      chainId: chainId.toLowerCase(),
      blockchainNonce: BigNumber.from(walletNonce ?? 0).toNumber(),
      lastSyncedTimestamp: new Date(),
      lastUsedNonce: -1,
      walletType: slug,
    };

    await insertIntoWallets(walletData, dbInstance);
  } catch (error) {
    throw error;
  }
};

export const addWalletDataWithSupportChainsNonceToDB = async (
  server: FastifyInstance,
  dbInstance: Knex,
  isWeb3APIInitWallet?: boolean,
  walletAddress?: string,
  extraTableData?: WalletExtraData,
): Promise<void> => {
  try {
    server.log.info("Setting up wallet Table");
    const supportedChains = await getSupportedChains();
    const promises = supportedChains.map(async (chain) => {
      try {
        const { slug } = chain;
        let lastUsedNonce = -1;
        let walletType = isWeb3APIInitWallet
          ? getInstanceAdminWalletType()
          : getWalletBackUpType();
        const sdk = await getSDK(slug, {
          walletAddress,
          walletType,
          awsKmsKeyId: extraTableData?.awsKmsKeyId,
        });
        walletAddress =
          (await sdk.getSigner()?.getAddress())?.toLowerCase() ?? "";
        server.log.debug(`Setting up wallet for chain ${slug}`);
        if (walletAddress.length === 0) {
          // server.log.warn(`Wallet address not found for chain ${slug}.`);
          throw new Error(`Wallet address not found for chain ${slug}.`);
        }
        const walletBlockchainNonce = await getWalletNonce(
          walletAddress,
          sdk.getProvider(),
        );
        const walletDataInDB = await getWalletDetails(
          walletAddress,
          BigNumber.from(chain.chainId).toString(),
          dbInstance,
        );

        if (walletDataInDB) {
          lastUsedNonce = walletDataInDB.lastUsedNonce;
        }

        // lastUsedNonce should be set to -1 if blockchainNonce is 0
        if (
          BigNumber.from(walletBlockchainNonce).eq(BigNumber.from(0)) &&
          BigNumber.from(lastUsedNonce).eq(BigNumber.from(0))
        ) {
          lastUsedNonce = -1;
        }

        if (
          extraTableData?.walletType &&
          extraTableData?.walletType.length > 0
        ) {
          walletType = extraTableData.walletType;
          delete extraTableData.walletType;
        }

        const walletData = {
          ...extraTableData,
          walletAddress: walletAddress.toLowerCase(),
          chainId: getChainBySlug(slug).chainId.toString(),
          blockchainNonce: BigNumber.from(
            walletBlockchainNonce ?? 0,
          ).toNumber(),
          lastSyncedTimestamp: new Date(),
          lastUsedNonce,
          slug,
          walletType,
        };
        return insertIntoWallets(walletData, dbInstance);
      } catch (error) {
        server.log.error((error as any).message);
        return Promise.resolve();
      }
    });

    await Promise.all(promises);
    server.log.info(`Wallet Table setup completed`);
  } catch (error) {
    throw error;
  }
};
