import LRUMap from "mnemonist/lru-map";
import { z } from "zod";
import { decrypt } from "../../utils/crypto";
import { env } from "../../utils/env";
import { prisma } from "../client";

export class WalletCredentialsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WalletCredentialsError";
  }
}

const walletCredentialsSchema = z.object({
  id: z.string(),
  type: z.literal("circle"),
  label: z.string().nullable(),
  data: z.object({
    entitySecret: z.string(),
  }),
  isDefault: z.boolean().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
});

export type ParsedWalletCredential = z.infer<typeof walletCredentialsSchema>;

export const walletCredentialsCache = new LRUMap<
  string,
  ParsedWalletCredential
>(env.ACCOUNT_CAHCE_SIZE);

interface GetWalletCredentialParams {
  id: string;
}

/**
 * Return the wallet credentials for the given id.
 * The entitySecret will be decrypted.
 * If the credentials are not found, an error is thrown.
 */
export const getWalletCredential = async ({
  id,
}: GetWalletCredentialParams) => {
  const cachedCredentials = walletCredentialsCache.get(id);
  if (cachedCredentials) {
    return cachedCredentials;
  }

  const credential = await prisma.walletCredentials.findUnique({
    where: {
      id,
    },
  });

  if (!credential) {
    throw new WalletCredentialsError(
      `No wallet credentials found for id ${id}`,
    );
  }

  const { data: parsedCredential, error: parseError } =
    walletCredentialsSchema.safeParse(credential);

  if (parseError) {
    throw new WalletCredentialsError(
      `Invalid Credential found for ${id}:\n${parseError.errors
        .map((error) => error.message)
        .join(", ")}`,
    );
  }

  parsedCredential.data.entitySecret = decrypt(
    parsedCredential.data.entitySecret,
    env.ENCRYPTION_PASSWORD,
  );

  walletCredentialsCache.set(id, parsedCredential);
  return parsedCredential;
};
