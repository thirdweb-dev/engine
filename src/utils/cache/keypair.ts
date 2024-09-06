import type { Keypairs } from "@prisma/client";
import { getKeypairByHash, getKeypairByPublicKey } from "../../db/keypair/get";

// Cache a public key to the Keypair object, or null if not found.
export const keypairCache = new Map<string, Keypairs | null>();

/**
 * Get a keypair by public key or hash.
 */
export const getKeypair = async (
  args:
    | {
        publicKey: string;
      }
    | {
        publicKeyHash: string;
      },
): Promise<Keypairs | null> => {
  const hasPublicKey = "publicKey" in args;

  const key = hasPublicKey
    ? `public-key:${args.publicKey}`
    : `public-key-hash:${args.publicKeyHash}`;

  const cached = keypairCache.get(key);
  if (cached) {
    return cached;
  }

  const keypair = hasPublicKey
    ? await getKeypairByPublicKey(args.publicKey)
    : await getKeypairByHash(args.publicKeyHash);

  keypairCache.set(key, keypair);
  return keypair;
};
