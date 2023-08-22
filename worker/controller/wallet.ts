import { getChainBySlug } from "@thirdweb-dev/chains";
import { getSupportedChains } from "@thirdweb-dev/sdk";
import { BigNumber } from "ethers";
import { FastifyInstance } from "fastify";
import { Knex } from "knex";
import { getSDK } from "../../core";
import { insertIntoWallets } from "../../core/database/dbOperation";
import { getWalletNonce } from "../../core/services/blockchain";
import {
  checkTableForPrimaryKey,
  getWalletDetailsWithoutTrx,
} from "../services/dbOperations";

export const setupWalletsForWorker = async (
  server: FastifyInstance,
  knex: Knex,
): Promise<void> => {
  try {
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
        let lastUsedNonce = -1;
        server.log.info(`Setting up wallet for chain ${slug}`);
        const sdk = await getSDK(slug);
        const walletAddress =
          (await sdk.getSigner()?.getAddress())?.toLowerCase() ?? "";
        if (walletAddress.length === 0) {
          server.log.warn(`Wallet address not found for chain ${slug}.`);
          continue;
        }
        const walletBlockchainNonce = await getWalletNonce(
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

        // lastUsedNonce should be set to -1 if blockchainNonce is 0
        if (
          BigNumber.from(walletBlockchainNonce).eq(BigNumber.from(0)) &&
          BigNumber.from(lastUsedNonce).eq(BigNumber.from(0))
        ) {
          lastUsedNonce = -1;
        }

        const walletData = {
          walletAddress: walletAddress.toLowerCase(),
          chainId: getChainBySlug(slug).chainId.toString(),
          blockchainNonce: BigNumber.from(
            walletBlockchainNonce ?? 0,
          ).toNumber(),
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
    // await knex.destroy();
  } catch (error) {
    server.log.error(error);
    throw error;
  } finally {
    return;
  }
};
