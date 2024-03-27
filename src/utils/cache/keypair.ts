import type { Keypairs } from "@prisma/client";
import { _getKeypair } from "../../db/keypair/get";

// Cache a public key to the Keypair object, or null if not found.
export const keypairCache = new Map<string, Keypairs | null>();

export const getKeypair = async ({
  publicKey,
}: {
  publicKey: string;
}): Promise<Keypairs | null> => {
  const cached = keypairCache.get(publicKey);
  if (cached) {
    return cached;
  }

  const keypair = await _getKeypair({ publicKey });
  keypairCache.set(publicKey, keypair);
  return keypair;
};
