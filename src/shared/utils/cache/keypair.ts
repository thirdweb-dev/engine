import type { Keypairs } from "@prisma/client";
import {
  getKeypairByHash,
  getKeypairByPublicKey,
} from "../../db/keypair/get.js";
import { LRUCache } from "lru-cache";

// Cache a public key to the Keypair object
export const keypairCache = new LRUCache<string, Keypairs>({ max: 2048 });

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

  if (!keypair) {
    return null;
  }

  keypairCache.set(key, keypair);
  return keypair;
};
