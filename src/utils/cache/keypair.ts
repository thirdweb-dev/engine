import type { Keypairs } from "@prisma/client";
import LRUMap from "mnemonist/lru-map";
import { getKeypairByHash, getKeypairByPublicKey } from "../../db/keypair/get";

// Cache a public key to the Keypair object, or null if not found.
export const keypairCache = new LRUMap<string, Keypairs | null>(2048);

/**
 * Get a keypair by public key or hash.
 */
export const getKeypair = async (args: {
  publicKey?: string;
  publicKeyHash?: string;
}): Promise<Keypairs | null> => {
  const { publicKey, publicKeyHash } = args;

  const key = publicKey
    ? `public-key:${args.publicKey}`
    : publicKeyHash
      ? `public-key-hash:${args.publicKeyHash}`
      : null;

  if (!key) {
    throw new Error('Must provide "publicKey" or "publicKeyHash".');
  }

  const cached = keypairCache.get(key);
  if (cached) {
    return cached;
  }

  const keypair = publicKey
    ? await getKeypairByPublicKey(publicKey)
    : publicKeyHash
      ? await getKeypairByHash(publicKeyHash)
      : null;

  keypairCache.set(key, keypair);
  return keypair;
};
