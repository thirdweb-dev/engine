import { createEnv } from "@t3-oss/env-core";
import * as dotenv from "dotenv";
import type { ZodError } from "zod";
import { z } from "zod";
import { WalletType } from "../schema/wallet";

// Load environment variables from .env file
dotenv.config({
  debug: true,
  override: false,
});

// Schema for validating JSON strings
export const JsonSchema = z.string().refine(
  (value) => {
    try {
      JSON.parse(value);
      return true;
    } catch {
      return false;
    }
  },
  { message: "Not a valid JSON string" },
);

// Schema for validating URLs
export const UrlSchema = z
  .string()
  .refine(
    (value) => value.startsWith("http://") || value.startsWith("https://"),
    { message: "Not a valid URL" },
  );

// Basic schema for validating file paths
export const FilePathSchema = z
  .string()
  .refine(
    (value) =>
      value.startsWith("./") || value.startsWith("/") || value.includes("."),
    { message: "Not a valid file path" },
  );

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
    CHAIN_OVERRIDES: z
      .union([JsonSchema, UrlSchema, FilePathSchema])
      .optional(),
    ACCESS_CONTROL_ALLOW_ORIGIN: z.string().default("*"),
    WEBHOOK_URL: z
      .string()
      .default("")
      .transform((url) => {
        if (url.length > 0) {
          return url;
        }
        return "";
      }),
    WEBHOOK_AUTH_BEARER_TOKEN: z.string().default(""),
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
    CHAIN_OVERRIDES: process.env.CHAIN_OVERRIDES,
    ACCESS_CONTROL_ALLOW_ORIGIN: process.env.ACCESS_CONTROL_ALLOW_ORIGIN,
    WEBHOOK_URL: process.env.WEBHOOK_URL,
    WEBHOOK_AUTH_BEARER_TOKEN: process.env.WEBHOOK_AUTH_BEARER_TOKEN,
  },
  onValidationError: (error: ZodError) => {
    console.error(
      "❌ Invalid environment variables:",
      error.flatten().fieldErrors,
    );
    throw new Error("Invalid environment variables");
  },
});
