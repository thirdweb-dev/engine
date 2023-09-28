import { createEnv } from "@t3-oss/env-core";
import * as dotenv from "dotenv";
import type { ZodError } from "zod";
import { z } from "zod";
import { WalletType } from "../schema/wallet";

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
    THIRDWEB_API_SECRET_KEY: z.string().min(1),
    POSTGRES_CONNECTION_URL: z
      .string()
      .default(
        "postgresql://postgres:postgres@localhost:5432/postgres?sslmode=disable",
      ),
    WALLET_CONFIGURATION: z.string().transform((config) =>
      z
        .union([
          z.object({
            type: z.literal(WalletType.local),
          }),
          z.object({
            type: z.literal(WalletType.awsKms),
            awsAccessKeyId: z.string().min(1),
            awsSecretAccessKey: z.string().min(1),
            awsRegion: z.string().min(1),
          }),
          z.object({
            type: z.literal(WalletType.gcpKms),
            gcpApplicationProjectId: z.string().min(1),
            gcpKmsLocationId: z.string().min(1),
            gcpKmsKeyRingId: z.string().min(1),
            // TODO: Are these optional?
            gcpApplicationCredentialEmail: z.string().min(1),
            gcpApplicationCredentialPrivateKey: z.string().min(1),
          }),
        ])
        .parse(JSON.parse(config)),
    ),
    OPENAPI_BASE_ORIGIN: z.string().default("http://localhost:3005"),
    PORT: z.coerce.number().default(3005),
    HOST: z.string().default("0.0.0.0"),
    MIN_TRANSACTION_TO_PROCESS: z.coerce.number().default(1),
    TRANSACTIONS_TO_BATCH: z.coerce.number().default(10),
    CHAIN_OVERRIDES: z.string().default(""),
    ACCESS_CONTROL_ALLOW_ORIGIN: z.string().default("*"),
    MINED_TX_CRON_ENABLED: boolSchema("true"),
    MINED_TX_CRON_SCHEDULE: z.string().default("*/5 * * * * *"),
    MIN_TX_TO_CHECK_FOR_MINED_STATUS: z.coerce.number().default(50),
    RETRY_TX_ENABLED: boolSchema("true"),
    MAX_FEE_PER_GAS_FOR_RETRY: z.string().default("55000000000"),
    MAX_PRIORITY_FEE_PER_GAS_FOR_RETRY: z.string().default("55000000000"),
    MAX_RETRIES_FOR_TX: z.coerce.number().default(15),
    RETRY_TX_CRON_SCHEDULE: z.string().default("*/30 * * * * *"),
    MAX_BLOCKS_ELAPSED_BEFORE_RETRY: z.coerce.number().default(10),
    MAX_WAIT_TIME_BEFORE_RETRY: z.coerce.number().default(600),
    WEBHOOK_URL: z
      .string()
      .default("")
      .transform((url) => {
        if (url.length > 0) {
          return url;
        }
        return "";
      }),
  },
  clientPrefix: "NEVER_USED",
  client: {},
  isServer: true,
  runtimeEnvStrict: {
    NODE_ENV: process.env.NODE_ENV,
    THIRDWEB_API_SECRET_KEY: process.env.THIRDWEB_API_SECRET_KEY,
    POSTGRES_CONNECTION_URL: process.env.POSTGRES_CONNECTION_URL,
    WALLET_CONFIGURATION:
      process.env.AWS_ACCESS_KEY_ID ||
      process.env.AWS_SECRET_ACCESS_KEY ||
      process.env.AWS_REGION
        ? JSON.stringify({
            type: WalletType.awsKms,
            awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
            awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            awsRegion: process.env.AWS_REGION,
          })
        : process.env.GOOGLE_APPLICATION_PROJECT_ID ||
          process.env.GOOGLE_KMS_LOCATION_ID ||
          process.env.GOOGLE_KMS_KEY_RING_ID ||
          process.env.GOOGLE_APPLICATION_CREDENTIAL_EMAIL ||
          process.env.GOOGLE_APPLICATION_CREDENTIAL_PRIVATE_KEY
        ? JSON.stringify({
            type: WalletType.gcpKms,
            gcpApplicationProjectId: process.env.GOOGLE_APPLICATION_PROJECT_ID,
            gcpKmsLocationId: process.env.GOOGLE_KMS_LOCATION_ID,
            gcpKmsKeyRingId: process.env.GOOGLE_KMS_KEY_RING_ID,
            gcpApplicationCredentialEmail:
              process.env.GOOGLE_APPLICATION_CREDENTIAL_EMAIL,
            gcpApplicationCredentialPrivateKey:
              process.env.GOOGLE_APPLICATION_CREDENTIAL_PRIVATE_KEY,
          })
        : JSON.stringify({
            type: WalletType.local,
          }),
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
    RETRY_TX_ENABLED: process.env.RETRY_TX_ENABLED,
    MAX_FEE_PER_GAS_FOR_RETRY: process.env.MAX_FEE_PER_GAS_FOR_RETRY,
    MAX_PRIORITY_FEE_PER_GAS_FOR_RETRY:
      process.env.MAX_PRIORITY_FEE_PER_GAS_FOR_RETRY,
    MAX_RETRIES_FOR_TX: process.env.MAX_RETRIES_FOR_TX,
    RETRY_TX_CRON_SCHEDULE: process.env.RETRY_TX_CRON_SCHEDULE,
    MAX_BLOCKS_ELAPSED_BEFORE_RETRY:
      process.env.MAX_BLOCKS_ELAPSED_BEFORE_RETRY,
    MAX_WAIT_TIME_BEFORE_RETRY: process.env.MAX_WAIT_TIME_BEFORE_RETRY,
    WEBHOOK_URL: process.env.WEBHOOK_URL,
  },
  onValidationError: (error: ZodError) => {
    console.error(
      "❌ Invalid environment variables:",
      error.flatten().fieldErrors,
    );
    throw new Error("Invalid environment variables");
  },
});
