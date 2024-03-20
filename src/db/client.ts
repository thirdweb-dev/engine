import { PrismaClient } from "@prisma/client";
import { Queue } from "bullmq";
import Redis from "ioredis";
import pg, { Knex } from "knex";
import { PrismaTransaction } from "../schema/prisma";
import { env } from "../utils/env";
import { logger } from "../utils/logger";

let redisClient: Redis;
let isRedisReady: boolean;

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
  acquireConnectionTimeout: 10000,
} as Knex.Config);

export const isDatabaseHealthy = async (): Promise<boolean> => {
  try {
    await prisma.walletDetails.findFirst();
    return true;
  } catch (error) {
    return false;
  }
};

// Initialize the Redis client with your Redis server configuration
// Update these configurations based on your Redis setup
export const getRedisClient = async (): Promise<Redis> => {
  if (!isRedisReady) {
    redisClient = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
    });
    redisClient.on("error", (err) => () => {
      logger({
        level: "error",
        message: `Redis error: ${err}`,
        service: "database",
      });
    });
    redisClient.on("connect", () =>
      logger({
        level: "info",
        message: "Redis connected",
        service: "database",
      }),
    );
    redisClient.on("reconnecting", () =>
      logger({
        level: "info",
        message: "Redis reconnecting",
        service: "database",
      }),
    );
    redisClient.on("ready", () => {
      isRedisReady = true;
      logger({
        level: "info",
        message: "Redis ready",
        service: "database",
      });
    });
  }

  return redisClient;
};

// Initialize BullMQ
export const bullMQConnection = {
  connection: await getRedisClient(),
  maxRetriesPerRequest: null,
};

// Create a Ingest Request Queue : API Request -> Bullmq Redis Queue
export const ingestRequestQueue = new Queue(
  "ingestRequestQueue",
  bullMQConnection,
);

// Create a Webhook Queue
export const webhookQueue = new Queue("webhookQueue", bullMQConnection);
