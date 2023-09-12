import { Ethereum } from "@thirdweb-dev/chains";
import { BigNumber } from "ethers";
import { FastifyInstance } from "fastify";
import { Knex } from "knex";
import { WalletData } from "../interfaces";
import { getSDK } from "../sdk/sdk";
import { getWalletNonce } from "../services/blockchain";
import { connectWithDatabase } from "./dbConnect";

interface WalletExtraData {
  awsKmsKeyId?: string;
  awsKmsArn?: string;
  walletType: string;
  gcpKmsKeyId?: string;
  gcpKmsKeyRingId?: string;
  gcpKmsLocationId?: string;
  gcpKmsKeyVersionId?: string;
  gcpKmsProjectId?: string;
  gcpKmsResourcePath?: string;
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
    const sdk = await getSDK(chainId, walletAddress);
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
  extraTableData: WalletExtraData,
  walletAddress: string,
): Promise<boolean> => {
  try {
    server.log.info(
      `Setting up wallet Table for walletType ${extraTableData?.walletType}, walletAddress ${walletAddress}`,
    );
    if (!walletAddress) {
      throw new Error(`Can't add wallet to DB without walletAddress`);
    }

    try {
      let lastUsedNonce = -1;
      let walletType = extraTableData.walletType;
      server.log.debug(`Wallet type: ${walletType} `);
      const walletDataInDB = await getWalletDetails(
        walletAddress,
        Ethereum.chainId.toString(),
        dbInstance,
      );
      server.log.debug(
        `Got the wallet data from DB ${JSON.stringify(walletDataInDB)}}`,
      );

      if (walletDataInDB) {
        lastUsedNonce = walletDataInDB.lastUsedNonce;
      }

      const walletData = {
        ...extraTableData,
        walletAddress: walletAddress.toLowerCase(),
        chainId: Ethereum.chainId.toString(),
        blockchainNonce: 0,
        lastSyncedTimestamp: new Date(),
        lastUsedNonce,
        slug: Ethereum.slug,
        walletType,
      };
      server.log.info(
        `Wallet Table about to insert: ${JSON.stringify(walletData)}}`,
      );
      const insert = await insertIntoWallets(walletData, dbInstance);
      server.log.debug(`Inserted the wallet data into DB, ${insert}`);
      const sdk = await getSDK(Ethereum.slug, walletAddress);
      /*server.log.debug(`Got the sdk for wallet`);*/
      /*const walletBlockchainNonce = await getWalletNonce(*/
      /*walletAddress,*/
      /*sdk.getProvider(),*/
      /*);*/
      /*server.log.debug(*/
      /*`Got the ${walletBlockchainNonce.toString()} for wallet`,*/
      /*);*/
      /*// lastUsedNonce should be set to -1 if blockchainNonce is 0*/
      /*if (*/
      /*BigNumber.from(walletBlockchainNonce).eq(BigNumber.from(0)) &&*/
      /*BigNumber.from(lastUsedNonce).eq(BigNumber.from(0))*/
      /*) {*/
      /*lastUsedNonce = -1;*/
      /*}*/

      return Promise.resolve(insert ? true : false);
    } catch (error) {
      throw error;
    }
  } catch (error) {
    throw error;
  }
};
