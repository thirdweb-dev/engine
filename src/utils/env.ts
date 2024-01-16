import { createEnv } from "@t3-oss/env-core";
import * as dotenv from "dotenv";
import type { ZodError } from "zod";
import { z } from "zod";

dotenv.config({
  debug: true,
  override: false,
});

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

export const UrlSchema = z
  .string()
  .refine(
    (value) => value.startsWith("http://") || value.startsWith("https://"),
    { message: "Not a valid URL" },
  );

export const FilePathSchema = z
  .string()
  .refine(
    (value) =>
      value.startsWith("./") || value.startsWith("/") || value.includes("."),
    { message: "Not a valid file path" },
  );

const boolSchema = (defaultBool: "true" | "false") =>
  z
    .string()
    .default(defaultBool)
    .refine((s) => s === "true" || s === "false", "must be 'true' or 'false'")
    .transform((s) => s === "true");

export const env = createEnv({
  server: {
    NODE_ENV: z
      .enum(["production", "development", "test", "local"])
      .default("development"),
    LOG_LEVEL: z
      .enum(["fatal", "error", "warn", "info", "debug", "trace"])
      .default("debug"),
    LOG_SERVICES: z
      .string()
      .default("server,worker,cache,websocket")
      .transform((s) =>
        z
          .array(z.enum(["server", "worker", "cache", "websocket"]))
          .parse(s.split(",")),
      ),
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
    ENABLE_HTTPS: boolSchema("false"),
    HTTPS_PASSPHRASE: z.string().default("thirdweb-engine"),
  },
  clientPrefix: "NEVER_USED",
  client: {},
  isServer: true,
  runtimeEnvStrict: {
    NODE_ENV: process.env.NODE_ENV,
    LOG_LEVEL: process.env.LOG_LEVEL,
    LOG_SERVICES: process.env.LOG_SERVICES,
    THIRDWEB_API_SECRET_KEY: process.env.THIRDWEB_API_SECRET_KEY,
    ADMIN_WALLET_ADDRESS: process.env.ADMIN_WALLET_ADDRESS,
    ENCRYPTION_PASSWORD: process.env.ENCRYPTION_PASSWORD,
    POSTGRES_CONNECTION_URL: process.env.POSTGRES_CONNECTION_URL,
    PORT: process.env.PORT,
    HOST: process.env.HOST,
    ENABLE_HTTPS: process.env.ENABLE_HTTPS,
    HTTPS_PASSPHRASE: process.env.HTTPS_PASSPHRASE,
  },
  onValidationError: (error: ZodError) => {
    console.error(
      "❌ Invalid environment variables:",
      error.flatten().fieldErrors,
    );
    throw new Error("Invalid environment variables");
  },
});
