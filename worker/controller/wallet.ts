import { FastifyInstance } from "fastify";
import { connectToDB, getSDK } from "../../core";
import { getChainBySlug } from "@thirdweb-dev/chains";
import { getWalletNonce } from "../../core/services/blockchain";
import {
  checkTableForPrimaryKey,
  getWalletDetailsWithoutTrx,
} from "../services/dbOperations";
import { BigNumber } from "ethers";
import { Knex } from "knex";
import { getSupportedChains } from "@thirdweb-dev/sdk";
import { insertIntoWallets } from "../../core/database/dbOperation";

export const setupWalletsForWorker = async (
  server: FastifyInstance,
): Promise<void> => {
  let knex: Knex | null = null;
  try {
    knex = await connectToDB(server);
    if (!knex) {
      throw new Error("DB connection not found");
    }

    server.log.info(`Checking for primary key in wallets table`);
    const pkExists = await checkTableForPrimaryKey(knex);

    if (!pkExists) {
      server.log.info(`Primary key not found in wallets table`);
      await knex.schema.alterTable("wallets", (table) => {
        table.primary(["walletAddress", "chainId"]);
      });
      server.log.info(`Added primary key to wallets table`);
    } else {
      server.log.info(`Primary key found in wallets table`);
    }
    for (const chain of getSupportedChains()) {
      try {
        const { slug } = chain;
        let lastUsedNonce = 0;
        server.log.info(`Setting up wallet for chain ${slug}`);
        const sdk = await getSDK(slug);
        const walletAddress =
          (await sdk.getSigner()?.getAddress())?.toLowerCase() ?? "";
        if (walletAddress.length === 0) {
          server.log.warn(`Wallet address not found for chain ${slug}.`);
          continue;
        }
        const walletNonce = await getWalletNonce(
          walletAddress,
          sdk.getProvider(),
        );
        const walletDataInDB = await getWalletDetailsWithoutTrx(
          walletAddress,
          BigNumber.from(chain.chainId).toString(),
          knex,
        );

        if (walletDataInDB) {
          lastUsedNonce = walletDataInDB.lastUsedNonce;
        }

        const walletData = {
          walletAddress: walletAddress.toLowerCase(),
          chainId: getChainBySlug(slug).chainId.toString(),
          blockchainNonce: BigNumber.from(walletNonce ?? 0).toNumber(),
          lastSyncedTimestamp: new Date(),
          lastUsedNonce,
          walletType: slug,
        };
        await insertIntoWallets(walletData, knex!);
      } catch (error) {
        server.log.error((error as any).message);
        continue;
      }
    }
    await knex.destroy();
  } catch (error) {
    server.log.error(error);
    throw error;
  } finally {
    return;
  }
};
