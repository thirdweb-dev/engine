import { LRUCache } from "lru-cache";
import { ResultAsync, err, ok, okAsync } from "neverthrow";
import { db } from "../db/connection";
import type { TokenDbEntry } from "../db/types";
import { type AccessTokenErr, type DbErr, mapDbError } from "./errors";

const accessTokenCache = new LRUCache<string, TokenDbEntry>({
  max: 1024,
});

export function getAccessToken(
  id: string,
): ResultAsync<TokenDbEntry, DbErr | AccessTokenErr> {
  const cached = accessTokenCache.get(id);
  if (cached) {
    return okAsync(cached);
  }

  return ResultAsync.fromPromise(
    db.query.tokens.findFirst({
      where: (tokens, { eq }) => eq(tokens.id, id),
    }),
    mapDbError,
  )
    .andTee((token) => {
      token && accessTokenCache.set(id, token ?? null);
    })
    .andThen((token) =>
      token
        ? ok(token)
        : err({
            kind: "access_token",
            code: "token_not_found",
            status: 400,
          } as AccessTokenErr),
    );
}
