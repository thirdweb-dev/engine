import * as z from "zod";

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

const envSchema = z.object({
  NODE_ENV: z
    .enum(["production", "development", "test", "local"])
    .default("development"),
  LOG_LEVEL: z
    .enum(["error", "warn", "info", "http", "debug", "silly"])
    .default("http"),
  ENGINE_VERSION: z.string().optional(),
  ENGINE_TIER: z.string().optional(),
  THIRDWEB_API_SECRET_KEY: z.string().min(1),
  ENCRYPTION_PASSWORD: z.string().min(1),
  VAULT_URL: z.string().url(),
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
  SEND_TRANSACTION_QUEUE_CONCURRENCY: z.coerce.number().default(1000),
  CONFIRM_TRANSACTION_QUEUE_CONCURRENCY: z.coerce.number().default(1000),
  SEND_TRANSACTION_WORKER_CONCURRENCY: z.coerce.number().default(200),
  CONFIRM_TRANSACTION_WORKER_CONCURRENCY: z.coerce.number().default(200),
  ENGINE_MODE: z
    .enum(["default", "sandbox", "server_only", "worker_only"])
    .default("default"),
  GLOBAL_RATE_LIMIT_PER_MIN: z.coerce.number().default(400 * 60),
  DD_TRACER_ACTIVATED: boolEnvSchema(false),
  FORCE_DB_MIGRATION: boolEnvSchema(false),
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
});

const { data: parsedEnv, error } = envSchema.safeParse(process.env);

if (error) {
  console.error(
    "❌ Invalid environment variables:",
    error.flatten().fieldErrors,
  );
  throw new Error("Invalid environment variables");
}

export const env = parsedEnv;
