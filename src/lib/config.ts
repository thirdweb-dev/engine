import { eq } from "drizzle-orm";
import { ResultAsync, err, ok, safeTry } from "neverthrow";
import * as z from "zod";
import { db } from "../db/connection.js";
import { configuration } from "../db/schema.js";
import type { ConfigInDb } from "../db/types.js";
import { provisionLocalAccount } from "./accounts/local.js";
import { decrypt } from "./crypto.js";
import {
  type ConfigErr,
  type CryptoErr,
  type DbErr,
  type LocalAccountErr,
  type ValidationErr,
  mapDbError,
  mapZodError,
} from "./errors.js";
import { initializeLogger } from "./logger.js";
import { redis } from "./redis.js";

const configLogger = initializeLogger("config");

export const configInRedisSchema = z.object({
  cacheClearIntervalSeconds: z.coerce.number().default(60 * 5),
});

type ConfigInRedis = z.infer<typeof configInRedisSchema>;
type DecryptedConfig = {
  mtlsCertificate: string | undefined;
  mtlsPrivateKey: string | undefined;
};
export type EngineConfig = ConfigInDb &
  ConfigInRedis & {
    decrypted: DecryptedConfig;
  };

export let config = (await fetchConfig())._unsafeUnwrap();

export function getConfigInRedis(): ResultAsync<
  ConfigInRedis,
  ConfigErr | ValidationErr
> {
  return ResultAsync.fromPromise(
    redis.get("config"),
    (): ConfigErr =>
      ({
        kind: "config",
        code: "redis_error",
        status: 500,
      }) as const,
  ).andThen((configStr) => {
    const configParsed =
      typeof configStr === "string" ? JSON.parse(configStr) : {};

    return ResultAsync.fromPromise(
      Promise.resolve(configInRedisSchema.parse(configParsed)),
      mapZodError,
    );
  });
}

export function getConfigInDb(): ResultAsync<
  ConfigInDb,
  DbErr | ConfigErr | LocalAccountErr
> {
  return ResultAsync.fromPromise(
    db.query.configuration.findFirst({
      where: eq(configuration.id, "default"),
    }),
    mapDbError,
  ).andThen((config) => {
    if (config) return ok(config);

    configLogger.info("No existing default config, writing new config");
    return provisionLocalAccount({ type: "local" })
      .asyncAndThen(({ account: _authAccount, encryptedJson }) =>
        ResultAsync.fromPromise(
          db
            .insert(configuration)
            .values({
              authEoaEncryptedJson: encryptedJson,
            })
            .onConflictDoNothing()
            .returning(),
          mapDbError,
        ),
      )
      .andThen(([result]) =>
        result
          ? ok(result)
          : err({
              kind: "config",
              code: "config_creation_failed",
              status: 500,
              message: "Failed to insert configuration",
            } as const),
      )
      .andTee(() => {
        configLogger.info("Successfully wrote new config");
      });
  });
}

export function fetchConfig(): ResultAsync<
  EngineConfig,
  DbErr | ConfigErr | ValidationErr | CryptoErr | LocalAccountErr
> {
  return ResultAsync.combine([getConfigInRedis(), getConfigInDb()])
    .map(([redisConfig, dbConfig]) => ({
      ...dbConfig,
      ...redisConfig,
    }))
    .andThen((config) =>
      safeTry(async function* () {
        const mtlsCertificate = config.mtlsCertificateEncrypted
          ? yield* decrypt(config.mtlsCertificateEncrypted)
          : undefined;

        const mtlsPrivateKey = config.mtlsPrivateKeyEncrypted
          ? yield* decrypt(config.mtlsPrivateKeyEncrypted)
          : undefined;

        return ok({
          ...config,
          decrypted: {
            mtlsCertificate,
            mtlsPrivateKey,
          },
        });
      }),
    );
}

export function refreshConfig(): ResultAsync<
  EngineConfig,
  DbErr | ConfigErr | ValidationErr | CryptoErr | LocalAccountErr
> {
  return fetchConfig().andTee((newConfig) => {
    config = newConfig;
  });
}
