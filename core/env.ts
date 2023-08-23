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
    // This is more dangerous because it is possible to forget about destructing a given key below, leading to errors. Avoid if possible
    WALLET_KEYS: z.union([
      z.object({
        WALLET_PRIVATE_KEY: z.string().min(1),
      }),
      z.object({
        AWS_ACCESS_KEY_ID: z.string().min(1),
        AWS_SECRET_ACCESS_KEY: z.string().min(1),
        AWS_KMS_KEY_ID: z.string().min(1),
        AWS_REGION: z.string().min(1),
      }),
    ]),
    THIRDWEB_SDK_SECRET_KEY: z.string().min(1),
    THIRDWEB_API_ORIGIN: z.string().default("http://api.thirdweb.com"),
    POSTGRES_HOST: z.string().default("localhost"),
    POSTGRES_DATABASE_NAME: z.string().default("postgres"),
    DATABASE_CLIENT: z.string().default("pg"),
    POSTGRES_USER: z.string().default("postgres"),
    POSTGRES_PASSWORD: z.string().default("postgres"),
    POSTGRES_PORT: z.coerce.number().default(5432),
    POSTGRES_USE_SSL: boolSchema("false"),
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
    IPFS_UPLOAD_URL: z.string().trim().url().optional(),
    IPFS_GATEWAY_URLS: z
      .string()
      .transform((val, ctx) => {
        const parsed = val.split(",");
        if (parsed.length === 0) {
          return;
        }

        parsed.forEach((url) => {
          if (z.string().trim().url().safeParse(url).success === false) {
            const index = parsed.indexOf(url);
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `Invalid IPFS_GATEWAY_URLS value: ${parsed.find(
                (u) => u === url,
              )}, at index ${index + 1}`,
            });

            // This is a special symbol you can use to
            // return early from the transform function.
            // It has type `never` so it does not affect the
            // inferred return type.
            return z.NEVER;
          }
        });
        return parsed;
      })
      .optional(),
  },
  clientPrefix: "NEVER_USED",
  client: {},
  isServer: true,
  runtimeEnvStrict: {
    NODE_ENV: process.env.NODE_ENV,
    WALLET_KEYS: {
      // The sdk expects a primitive type but we can overload it here to be an object
      WALLET_PRIVATE_KEY: process.env.WALLET_PRIVATE_KEY,
      AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
      AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
      AWS_KMS_KEY_ID: process.env.AWS_KMS_KEY_ID,
      AWS_REGION: process.env.AWS_REGION,
    } as any,
    THIRDWEB_SDK_SECRET_KEY: process.env.THIRDWEB_SDK_SECRET_KEY,
    THIRDWEB_API_ORIGIN: process.env.THIRDWEB_API_ORIGIN,
    POSTGRES_HOST: process.env.POSTGRES_HOST,
    POSTGRES_DATABASE_NAME: process.env.POSTGRES_DATABASE_NAME,
    DATABASE_CLIENT: process.env.DATABASE_CLIENT,
    POSTGRES_USER: process.env.POSTGRES_USER,
    POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD,
    POSTGRES_PORT: process.env.POSTGRES_PORT,
    POSTGRES_USE_SSL: process.env.POSTGRES_USE_SSL,
    DB_TABLES_LIST: process.env.DB_TABLES_LIST,
    DB_TRIGGERS_LIST: process.env.DB_TRIGGERS_LIST,
    PORT: process.env.PORT,
    HOST: process.env.HOST,
    OPENAPI_BASE_ORIGIN: process.env.OPENAPI_BASE_ORIGIN,
    MIN_TRANSACTION_TO_PROCESS: process.env.MIN_TRANSACTION_TO_PROCESS,
    TRANSACTIONS_TO_BATCH: process.env.TRANSACTIONS_TO_BATCH,
    CHAIN_OVERRIDES: process.env.CHAIN_OVERRIDES,
    ACCESS_CONTROL_ALLOW_ORIGIN: process.env.ACCESS_CONTROL_ALLOW_ORIGIN,
    IPFS_UPLOAD_URL: process.env.IPFS_UPLOAD_URL,
    IPFS_GATEWAY_URLS: process.env.IPFS_GATEWAY_URLS,
  },
  onValidationError: (error: ZodError) => {
    if ("WALLET_KEYS" in error.format()) {
      console.error(
        "❌ Please set WALLET_PRIVATE_KEY or [AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_KMS_KEY_ID] for AWS KMS Wallet as ENV Variables.",
      );
    } else {
      console.error(
        "❌ Invalid environment variables:",
        error.flatten().fieldErrors,
      );
    }
    throw new Error("Invalid environment variables");
  },
});
