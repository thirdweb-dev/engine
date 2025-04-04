import { privateKeyToAccount, randomPrivateKey } from "thirdweb/wallets";
import { thirdwebClient } from "../thirdweb-client.js";
import { env } from "../env.js";
import { decryptKeystore, generateKeystore } from "../keystore.js";
import { Result } from "neverthrow";
import type { LocalAccountErr } from "../errors.js";
import * as z from "zod";
import { baseAccountCreateSchema } from "./base-schemas.js";

const type = z.literal("local");

export const localPlatformIdentifiersSchema = z.object({
  platformIdentifiers: z.null(),
  type,
});

export const localAccountCreateParamsSchema = z
  .object({
    type,
    // encryptionPassword: z.string().optional().openapi({
    //   description:
    //     "The encryption password used to encrypt the account. This is unrecoverable, and should be kept secret. IF YOU LOSE THIS PASSWORD, YOU WILL LOSE ACCESS TO YOUR ACCOUNT. If omitted, your account will be encrypted with the default encryption password. This is only valid for local accounts.",
    // }),
  })
  .merge(baseAccountCreateSchema);

/**
 * Create a local wallet with a random private key
 * Does not store the wallet in the database
 */
export function provisionLocalAccount(
  _params: Omit<z.infer<typeof localAccountCreateParamsSchema>, "label">,
) {
  const pk = randomPrivateKey();

  const account = privateKeyToAccount({
    client: thirdwebClient,
    privateKey: pk,
  });

  return Result.fromThrowable(
    () =>
      generateKeystore(
        pk,
        // params.encryptionPassword ??
        env.ENCRYPTION_PASSWORD,
      ),
    (error): LocalAccountErr => ({
      kind: "local_account",
      code: "account_creation_failed",
      message: error instanceof Error ? error.message : undefined,
      status: 500,
      source: error instanceof Error ? error : undefined,
    }),
  )().map((encryptedJsonData) => ({
    account,
    encryptedJson: JSON.stringify(encryptedJsonData),
  }));
}

export function encryptedJsonToAccount({
  json,
  encryptionPassword = env.ENCRYPTION_PASSWORD,
}: {
  json: string;
  encryptionPassword?: string;
}) {
  return Result.fromThrowable(
    () => decryptKeystore(JSON.parse(json), encryptionPassword),
    (error): LocalAccountErr => ({
      kind: "local_account",
      code: "account_decryption_failed",
      message: error instanceof Error ? error.message : undefined,
      status: 500,
      source: error instanceof Error ? error : undefined,
    }),
  )().map((privateKey) =>
    privateKeyToAccount({
      client: thirdwebClient,
      privateKey,
    }),
  );
}
