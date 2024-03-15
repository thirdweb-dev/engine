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
export const getRedis = async (): Promise<Redis> => {
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
// Function to gracefully shutdown the Redis client
export const shutdownRedisClient = async () => {
  try {
    await redisClient.quit();
    console.log("Redis client disconnected successfully.");
  } catch (error) {
    console.error("Error disconnecting Redis client:", error);
  }
};

// Graceful shutdown handling for the process
// process.on("SIGINT", async () => {
//   // Handle other graceful shutdown logic here, if necessary
//   await shutdownRedisClient();
//   await prisma.$disconnect();
//   await knex.destroy();
//   // Exit the process after all shutdown tasks are complete
//   process.exit(0);
// });

// process.on("SIGTERM", async () => {
//   // Handle other graceful shutdown logic here, if necessary
//   await shutdownRedisClient();
//   await prisma.$disconnect();
//   await knex.destroy();
//   // Exit the process after all shutdown tasks are complete
//   process.exit(0);
// });

// Initialize BullMQ
export const bullMQConnection = {
  connection: await getRedis(),
  maxRetriesPerRequest: 3, // TODO: have an env var
};

// Create a Raw Request Queue
export const rawRequestQueue = new Queue("rawRequestQueue", bullMQConnection);

export const webhookQueue = new Queue("webhookQueue", bullMQConnection);
