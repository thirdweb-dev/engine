import { createEnv } from "@t3-oss/env-core";
import * as dotenv from "dotenv";
import type { ZodError } from "zod";
import { z } from "zod";

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
    ADMIN_WALLET_ADDRESS: z.string().min(1),
    POSTGRES_CONNECTION_URL: z
      .string()
      .default(
        "postgresql://postgres:postgres@localhost:5432/postgres?sslmode=disable",
      ),
    PORT: z.coerce.number().default(3005),
    HOST: z.string().default("0.0.0.0"),
    ACCESS_CONTROL_ALLOW_ORIGIN: z.string().default("*"),
  },
  clientPrefix: "NEVER_USED",
  client: {},
  isServer: true,
  runtimeEnvStrict: {
    NODE_ENV: process.env.NODE_ENV,
    THIRDWEB_API_SECRET_KEY: process.env.THIRDWEB_API_SECRET_KEY,
    ADMIN_WALLET_ADDRESS: process.env.ADMIN_WALLET_ADDRESS,
    POSTGRES_CONNECTION_URL: process.env.POSTGRES_CONNECTION_URL,
    PORT: process.env.PORT,
    HOST: process.env.HOST,
    ACCESS_CONTROL_ALLOW_ORIGIN: process.env.ACCESS_CONTROL_ALLOW_ORIGIN,
  },
  onValidationError: (error: ZodError) => {
    console.error(
      "❌ Invalid environment variables:",
      error.flatten().fieldErrors,
    );
    throw new Error("Invalid environment variables");
  },
});
