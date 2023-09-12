import { createEnv } from "@t3-oss/env-core";
import * as dotenv from "dotenv";
import type { ZodError } from "zod";
import { z } from "zod";

dotenv.config({
  debug: true,
  override: false,
});

const boolSchema = (defaultBool: "true" | "false") =>
  z
    .string()
    .default(defaultBool)
    // only allow "true" or "false"
    .refine((s) => s === "true" || s === "false", "must be 'true' or 'false'")
    // transform to boolean
    .transform((s) => s === "true");

// ! to make something required, use z.string().min(1) to be sure
export const env = createEnv({
  server: {
    NODE_ENV: z
      .enum(["production", "development", "testing", "local"])
      .default("development"),
    WALLET_PRIVATE_KEY: z.string().min(1).optional(),
    AWS_KMS_KEY_ID: z.string().min(1).optional(),
    GOOGLE_KMS_KEY_ID: z.string().min(1).optional(),
    AWS_ACCESS_KEY_ID: z.string().min(1).optional(),
    AWS_SECRET_ACCESS_KEY: z.string().min(1).optional(),
    AWS_REGION: z.string().min(1).optional(),
    THIRDWEB_API_SECRET_KEY: z.string().min(1),
    THIRDWEB_API_ORIGIN: z.string().default("http://api.thirdweb.com"),
    DATABASE_CLIENT: z.string().default("pg"),
    POSTGRES_CONNECTION_URL: z
      .string()
      .default(
        "postgresql://postgres:postgres@localhost:5432/postgres?sslmode=disable",
      ),
    OPENAPI_BASE_ORIGIN: z.string().default("http://localhost:3005"),
    DB_TABLES_LIST: z.string().default("wallets,transactions"),
    DB_TRIGGERS_LIST: z
      .string()
      .default("trigger_notification,trigger_tx_table"),
    PORT: z.coerce.number().default(3005),
    HOST: z.string().default("0.0.0.0"),
    MIN_TRANSACTION_TO_PROCESS: z.coerce.number().default(1),
    TRANSACTIONS_TO_BATCH: z.coerce.number().default(10),
    CHAIN_OVERRIDES: z.string().default(""),
    ACCESS_CONTROL_ALLOW_ORIGIN: z.string().default("*"),
    MINED_TX_CRON_ENABLED: boolSchema("true"),
    MINED_TX_CRON_SCHEDULE: z.string().default("*/5 * * * * *"),
    MIN_TX_TO_CHECK_FOR_MINED_STATUS: z.coerce.number().default(50),
    GOOGLE_APPLICATION_PROJECT_ID: z.string().min(1).optional(),
    GOOGLE_KMS_KEY_RING_ID: z.string().min(1).optional(),
    GOOGLE_KMS_LOCATION_ID: z.string().min(1).optional(),
    GOOGLE_KMS_KEY_VERSION_ID: z.string().min(1).optional(),
    GOOGLE_APPLICATION_CREDENTIAL_EMAIL: z.string().min(1).optional(),
    GOOGLE_APPLICATION_CREDENTIAL_PRIVATE_KEY: z.string().min(1).optional(),
    RETRY_TX_ENABLED: boolSchema("true"),
    MAX_FEE_PER_GAS_FOR_RETRY: z.string().default("55000000000"),
    MAX_PRIORITY_FEE_PER_GAS_FOR_RETRY: z.string().default("55000000000"),
    MAX_RETRIES_FOR_TX: z.coerce.number().default(3),
    RETRY_TX_CRON_SCHEDULE: z.string().default("*/30 * * * * *"),
    MAX_BLOCKS_ELAPSED_BEFORE_RETRY: z.coerce.number().default(50),
    MAX_WAIT_TIME_BEFORE_RETRY: z.coerce.number().default(600),
  },
  clientPrefix: "NEVER_USED",
  client: {},
  isServer: true,
  runtimeEnvStrict: {
    NODE_ENV: process.env.NODE_ENV,
    WALLET_PRIVATE_KEY: process.env.WALLET_PRIVATE_KEY,
    AWS_KMS_KEY_ID: process.env.AWS_KMS_KEY_ID,
    GOOGLE_KMS_KEY_ID: process.env.GOOGLE_KMS_KEY_ID,
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
    AWS_REGION: process.env.AWS_REGION,
    THIRDWEB_API_SECRET_KEY: process.env.THIRDWEB_API_SECRET_KEY,
    THIRDWEB_API_ORIGIN: process.env.THIRDWEB_API_ORIGIN,
    DATABASE_CLIENT: process.env.DATABASE_CLIENT,
    POSTGRES_CONNECTION_URL: process.env.POSTGRES_CONNECTION_URL,
    DB_TABLES_LIST: process.env.DB_TABLES_LIST,
    DB_TRIGGERS_LIST: process.env.DB_TRIGGERS_LIST,
    PORT: process.env.PORT,
    HOST: process.env.HOST,
    OPENAPI_BASE_ORIGIN: process.env.OPENAPI_BASE_ORIGIN,
    MIN_TRANSACTION_TO_PROCESS: process.env.MIN_TRANSACTION_TO_PROCESS,
    TRANSACTIONS_TO_BATCH: process.env.TRANSACTIONS_TO_BATCH,
    CHAIN_OVERRIDES: process.env.CHAIN_OVERRIDES,
    ACCESS_CONTROL_ALLOW_ORIGIN: process.env.ACCESS_CONTROL_ALLOW_ORIGIN,
    MINED_TX_CRON_ENABLED: process.env.MINED_TX_CRON_ENABLED,
    MINED_TX_CRON_SCHEDULE: process.env.MINED_TX_CRON_SCHEDULE,
    MIN_TX_TO_CHECK_FOR_MINED_STATUS:
      process.env.MIN_TX_TO_CHECK_FOR_MINED_STATUS,
    GOOGLE_APPLICATION_PROJECT_ID: process.env.GOOGLE_APPLICATION_PROJECT_ID,
    GOOGLE_KMS_KEY_RING_ID: process.env.GOOGLE_KMS_KEY_RING_ID,
    GOOGLE_KMS_LOCATION_ID: process.env.GOOGLE_KMS_LOCATION_ID,
    GOOGLE_KMS_KEY_VERSION_ID: process.env.GOOGLE_KMS_KEY_VERSION_ID,
    GOOGLE_APPLICATION_CREDENTIAL_EMAIL:
      process.env.GOOGLE_APPLICATION_CREDENTIAL_EMAIL,
    GOOGLE_APPLICATION_CREDENTIAL_PRIVATE_KEY:
      process.env.GOOGLE_APPLICATION_CREDENTIAL_PRIVATE_KEY,
    RETRY_TX_ENABLED: process.env.RETRY_TX_ENABLED,
    MAX_FEE_PER_GAS_FOR_RETRY: process.env.MAX_FEE_PER_GAS_FOR_RETRY,
    MAX_PRIORITY_FEE_PER_GAS_FOR_RETRY:
      process.env.MAX_PRIORITY_FEE_PER_GAS_FOR_RETRY,
    MAX_RETRIES_FOR_TX: process.env.MAX_RETRIES_FOR_TX,
    RETRY_TX_CRON_SCHEDULE: process.env.RETRY_TX_CRON_SCHEDULE,
    MAX_BLOCKS_ELAPSED_BEFORE_RETRY:
      process.env.MAX_BLOCKS_ELAPSED_BEFORE_RETRY,
    MAX_WAIT_TIME_BEFORE_RETRY: process.env.MAX_WAIT_TIME_BEFORE_RETRY,
  },
  onValidationError: (error: ZodError) => {
    console.error(
      "❌ Invalid environment variables:",
      error.flatten().fieldErrors,
    );
    throw new Error("Invalid environment variables");
  },
});
