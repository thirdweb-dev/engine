import { FastifyInstance } from "fastify";
import { connectToDB, getSDK } from "../../core";
import { defaultChains, getChainBySlug } from "@thirdweb-dev/chains";
import { getWalletNonce } from "../services/blockchain";
import { insertIntoWallets } from "../services/dbOperations";
import { BigNumber } from "ethers";
import { Knex } from "knex";

export const setupWalletsForWorker = async (
  server: FastifyInstance,
): Promise<void> => {
  let knex: Knex | null = null;
  try {
    knex = await connectToDB(server);
    if (!knex) {
      throw new Error("DB connection not found");
    }

    // Connect to the DB
    server.log.info(`Connected to DB`);

    const walletData = [];

    for (const chain of defaultChains) {
      const { slug } = chain;
      if (slug === "localhost") {
        server.log.warn(`Skipping localhost`);
        return;
      }
      server.log.info(`Setting up wallet for chain ${chain.slug}`);

      const sdk = await getSDK(slug);
      const walletAddress = (await sdk.getSigner()?.getAddress()) ?? "";
      if (walletAddress.length === 0) {
        server.log.warn(`Wallet address not found for chain ${slug}`);
        continue;
      }
      const walletNonce = await getWalletNonce(
        walletAddress,
        sdk.getProvider(),
      );
      walletData.push({
        walletAddress: walletAddress.toLowerCase(),
        chainId: getChainBySlug(slug).chainId.toString(),
        lastUsedNonce: 0,
        blockchainNonce: BigNumber.from(walletNonce ?? 0).toNumber(),
        lastSyncedTimestamp: new Date(),
        walletType: slug,
      });
    }
    await insertIntoWallets(walletData, knex!);
    await knex.destroy();
  } catch (error) {
    throw error;
  } finally {
    return;
  }
};
