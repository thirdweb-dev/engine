import { LRUCache } from "lru-cache";
import { ResultAsync, err, errAsync, ok, okAsync } from "neverthrow";
import { db } from "../db/connection.js";
import type { KeypairDbEntry } from "../db/types.js";
import { type KeypairErr, type DbErr, mapDbError } from "./errors.js";

const keypairCache = new LRUCache<string, KeypairDbEntry>({
  max: 1024,
});

type GetKeypairParams = {
  publicKey?: string;
  publicKeyHash?: string;
};

export function getKeypair({
  publicKey,
  publicKeyHash,
}: GetKeypairParams): ResultAsync<KeypairDbEntry, DbErr | KeypairErr> {
  const id = publicKeyHash ?? publicKey;
  if (!id) {
    return errAsync({
      kind: "keypair",
      code: "missing_identifier",
      status: 400,
    } as const);
  }

  const cached = keypairCache.get(id);
  if (cached) {
    return okAsync(cached);
  }

  return ResultAsync.fromPromise(
    db.query.keypairs.findFirst({
      where: (keypairs, { or, eq, and, isNull }) =>
        and(
          or(
            publicKey ? eq(keypairs.publicKey, publicKey) : undefined,
            publicKeyHash ? eq(keypairs.hash, publicKeyHash) : undefined,
          ),
          isNull(keypairs.deletedAt),
        ),
    }),
    mapDbError,
  )
    .andTee((keypair) => {
      keypair && keypairCache.set(id, keypair);
    })
    .andThen((keypair) =>
      keypair
        ? ok(keypair)
        : err({
            kind: "keypair",
            code: "keypair_not_found",
            status: 400,
          } as const),
    );
}
