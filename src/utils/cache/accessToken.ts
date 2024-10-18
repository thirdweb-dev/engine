import type { Tokens } from "@prisma/client";
import LRUMap from "mnemonist/lru-map";
import { getToken } from "../../db/tokens/getToken";

// Cache an access token JWT to the token object, or null if not found.
export const accessTokenCache = new LRUMap<string, Tokens | null>(1);

interface GetAccessTokenParams {
  jwt: string;
}

export const getAccessToken = async ({
  jwt,
}: GetAccessTokenParams): Promise<Tokens | null> => {
  const cached = accessTokenCache.get(jwt);
  if (cached) {
    console.log("[DEBUG] found access token in cache");
    return cached;
  }

  console.log("[DEBUG] access token not in cache");
  const accessToken = await getToken(jwt);
  accessTokenCache.set(jwt, accessToken);
  return accessToken;
};
