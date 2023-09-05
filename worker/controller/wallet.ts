import { FastifyInstance } from "fastify";
import { Knex } from "knex";
import {
  addWalletDataWithSupportChainsNonceToDB,
  connectWithDatabase,
} from "../../core";
import { checkTableForPrimaryKey } from "../services/dbOperations";

export const setupWalletsForWorker = async (
  server: FastifyInstance,
): Promise<void> => {
  let knex: Knex | undefined;
  try {
    knex = await connectWithDatabase();
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
    await addWalletDataWithSupportChainsNonceToDB(server, knex, true);
    await knex.destroy();
  } catch (error) {
    server.log.error(error);
    throw error;
  } finally {
    return;
  }
};
