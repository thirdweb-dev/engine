import { PrismaClient } from "@prisma/client";
import pg, { Knex } from "knex";
import { PrismaTransaction } from "../schema/prisma";
import { env } from "../utils/env";

export const prisma = new PrismaClient({
  log: ["info"],
});

export const getPrismaWithPostgresTx = (pgtx?: PrismaTransaction) => {
  return pgtx || prisma;
};

export const knex = pg({
  client: "pg",
  connection: {
    connectionString: env.POSTGRES_CONNECTION_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  },
  acquireConnectionTimeout: 30000,
} as Knex.Config);

export const isDatabaseReachable = async () => {
  try {
    await prisma.walletDetails.findFirst();
    return true;
  } catch (error) {
    return false;
  }
};
