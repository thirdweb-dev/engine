import { createEnv } from "@t3-oss/env-core";
import * as dotenv from "dotenv";
import type { ZodError } from "zod";
import { z } from "zod";

const path = process.env.NODE_ENV === "test" ? ".env.test" : ".env";
dotenv.config({ path });

const boolEnvSchema = (defaultBool: boolean) =>
  z
    .string()
    .default(defaultBool ? "true" : "false")
    .refine((s) => s === "true" || s === "false", "must be 'true' or 'false'")
    .transform((s) => s === "true");

export const UrlSchema = z
  .string()
  .refine(
    (value) => value.startsWith("http://") || value.startsWith("https://"),
    { message: "Invalid URL" },
  );

export const env = createEnv({
  server: {
    NODE_ENV: z
      .enum(["production", "development", "test", "local"])
      .default("development"),
    LOG_LEVEL: z
      .enum(["fatal", "error", "warn", "info", "debug", "trace"])
      .default("info"),
    LOG_SERVICES: z
      .string()
      .default("server,worker,cache,websocket")
      .transform((s) =>
        z
          .array(z.enum(["server", "worker", "cache", "websocket"]))
          .parse(s.split(",")),
      ),
    ENGINE_VERSION: z.string().optional(),
    ENGINE_TIER: z.string().optional(),
    THIRDWEB_API_SECRET_KEY: z.string().min(1),
    ADMIN_WALLET_ADDRESS: z.string().min(1),
    ENCRYPTION_PASSWORD: z.string().min(1),
    POSTGRES_CONNECTION_URL: z
      .string()
      .default(
        "postgresql://postgres:postgres@localhost:5432/postgres?sslmode=disable",
      ),
    PORT: z.coerce.number().default(3005),
    HOST: z.string().default("0.0.0.0"),
    ENABLE_HTTPS: boolEnvSchema(false),
    HTTPS_PASSPHRASE: z.string().default("thirdweb-engine"),
    TRUST_PROXY: boolEnvSchema(false),
    CLIENT_ANALYTICS_URL: z
      .union([UrlSchema, z.literal("")])
      .default("https://c.thirdweb.com/event"),
    SDK_BATCH_TIME_LIMIT: z.coerce.number().default(0),
    SDK_BATCH_SIZE_LIMIT: z.coerce.number().default(100),
    REDIS_URL: z.string(),
    SEND_TRANSACTION_QUEUE_CONCURRENCY: z.coerce.number().default(200),
    CONFIRM_TRANSACTION_QUEUE_CONCURRENCY: z.coerce.number().default(200),
    ENGINE_MODE: z
      .enum(["default", "sandbox", "server_only", "worker_only"])
      .default("default"),
    GLOBAL_RATE_LIMIT_PER_MIN: z.coerce.number().default(400 * 60),
    ACCOUNT_CACHE_SIZE: z.coerce.number().default(2048),
    DD_TRACER_ACTIVATED: boolEnvSchema(false),

    // Prometheus
    METRICS_PORT: z.coerce.number().default(4001),
    METRICS_ENABLED: boolEnvSchema(true),

    /**
     * Limits
     */
    // Sets the max amount of memory Redis can use.
    // "0" means use all available memory.
    REDIS_MAXMEMORY: z.string().default("0"),
    // Sets the number of recent transactions to store. Older transactions are pruned periodically.
    // In testing, 100k transactions consumes ~300mb memory.
    TRANSACTION_HISTORY_COUNT: z.coerce.number().default(100_000),
    // Sets the number of recent completed jobs in each queue.
    QUEUE_COMPLETE_HISTORY_COUNT: z.coerce.number().default(2_000),
    // Sets the number of recent failed jobs in each queue.
    // These limits are higher to debug failed jobs.
    QUEUE_FAIL_HISTORY_COUNT: z.coerce.number().default(10_000),
    // Sets the number of recent nonces to map to queue IDs.
    NONCE_MAP_COUNT: z.coerce.number().default(10_000),

    ENABLE_KEYPAIR_AUTH: boolEnvSchema(false),
    ENABLE_CUSTOM_HMAC_AUTH: boolEnvSchema(false),
    CUSTOM_HMAC_AUTH_CLIENT_ID: z.string().optional(),
    CUSTOM_HMAC_AUTH_CLIENT_SECRET: z.string().optional(),

    /**
     * Experimental env vars. These may be renamed or removed in future non-major releases.
     */
    // Sets how long the mine worker waits for a transaction receipt before considering the transaction dropped. Default: 30 minutes
    EXPERIMENTAL__MINE_WORKER_TIMEOUT_SECONDS: z.coerce
      .number()
      .default(30 * 60),
    // Sets the max gas price for a transaction attempt. Most RPCs reject transactions above a certain gas price. Default: 10^18 wei.
    EXPERIMENTAL__MAX_GAS_PRICE_WEI: z.coerce.number().default(10 ** 18),
  },
  clientPrefix: "NEVER_USED",
  client: {},
  isServer: true,
  runtimeEnvStrict: {
    NODE_ENV: process.env.NODE_ENV,
    LOG_LEVEL: process.env.LOG_LEVEL,
    LOG_SERVICES: process.env.LOG_SERVICES,
    ENGINE_VERSION: process.env.ENGINE_VERSION,
    ENGINE_TIER: process.env.ENGINE_TIER,
    THIRDWEB_API_SECRET_KEY: process.env.THIRDWEB_API_SECRET_KEY,
    ADMIN_WALLET_ADDRESS: process.env.ADMIN_WALLET_ADDRESS,
    ENCRYPTION_PASSWORD: process.env.ENCRYPTION_PASSWORD,
    POSTGRES_CONNECTION_URL: process.env.POSTGRES_CONNECTION_URL,
    PORT: process.env.PORT,
    HOST: process.env.HOST,
    ENABLE_HTTPS: process.env.ENABLE_HTTPS,
    HTTPS_PASSPHRASE: process.env.HTTPS_PASSPHRASE,
    TRUST_PROXY: process.env.TRUST_PROXY,
    CLIENT_ANALYTICS_URL: process.env.CLIENT_ANALYTICS_URL,
    SDK_BATCH_TIME_LIMIT: process.env.SDK_BATCH_TIME_LIMIT,
    SDK_BATCH_SIZE_LIMIT: process.env.SDK_BATCH_SIZE_LIMIT,
    REDIS_URL: process.env.REDIS_URL,
    SEND_TRANSACTION_QUEUE_CONCURRENCY:
      process.env.SEND_TRANSACTION_QUEUE_CONCURRENCY,
    CONFIRM_TRANSACTION_QUEUE_CONCURRENCY:
      process.env.CONFIRM_TRANSACTION_QUEUE_CONCURRENCY,
    ENGINE_MODE: process.env.ENGINE_MODE,
    REDIS_MAXMEMORY: process.env.REDIS_MAXMEMORY,
    TRANSACTION_HISTORY_COUNT: process.env.TRANSACTION_HISTORY_COUNT,
    GLOBAL_RATE_LIMIT_PER_MIN: process.env.GLOBAL_RATE_LIMIT_PER_MIN,
    DD_TRACER_ACTIVATED: process.env.DD_TRACER_ACTIVATED,
    QUEUE_COMPLETE_HISTORY_COUNT: process.env.QUEUE_COMPLETE_HISTORY_COUNT,
    QUEUE_FAIL_HISTORY_COUNT: process.env.QUEUE_FAIL_HISTORY_COUNT,
    NONCE_MAP_COUNT: process.env.NONCE_MAP_COUNT,
    EXPERIMENTAL__MINE_WORKER_TIMEOUT_SECONDS:
      process.env.EXPERIMENTAL__MINE_WORKER_TIMEOUT_SECONDS,
    EXPERIMENTAL__MAX_GAS_PRICE_WEI:
      process.env.EXPERIMENTAL__MAX_GAS_PRICE_WEI,
    METRICS_PORT: process.env.METRICS_PORT,
    METRICS_ENABLED: process.env.METRICS_ENABLED,
    ENABLE_KEYPAIR_AUTH: process.env.ENABLE_KEYPAIR_AUTH,
    ENABLE_CUSTOM_HMAC_AUTH: process.env.ENABLE_CUSTOM_HMAC_AUTH,
    CUSTOM_HMAC_AUTH_CLIENT_ID: process.env.CUSTOM_HMAC_AUTH_CLIENT_ID,
    CUSTOM_HMAC_AUTH_CLIENT_SECRET: process.env.CUSTOM_HMAC_AUTH_CLIENT_SECRET,
    ACCOUNT_CACHE_SIZE: process.env.ACCOUNT_CAHCE_SIZE,
  },
  onValidationError: (error: ZodError) => {
    console.error(
      "❌ Invalid environment variables:",
      error.flatten().fieldErrors,
    );
    throw new Error("Invalid environment variables");
  },
});
