import type { Tokens } from "@prisma/client";
import { getToken } from "../../db/tokens/get-token.js";
import { LRUCache } from "lru-cache";

const undefinedValue = Symbol("undefined");
// Cache an access token JWT to the token object, or undefinedValue if not found.
export const accessTokenCache = new LRUCache<
  string,
  Tokens | typeof undefinedValue
>({
  max: 1024,
});

interface GetAccessTokenParams {
  jwt: string;
}

export const getAccessToken = async ({
  jwt,
}: GetAccessTokenParams): Promise<Tokens | null> => {
  const cached = accessTokenCache.get(jwt);
  if (cached) {
    return cached === undefinedValue ? null : cached;
  }

  const accessToken = await getToken(jwt);
  accessTokenCache.set(jwt, accessToken ?? undefinedValue);
  return accessToken;
};
