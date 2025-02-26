import type { Tokens } from "@prisma/client";
import LRUMap from "mnemonist/lru-map";
import { getToken } from "../../db/tokens/get-token";
import { env } from "../env";

// Cache an access token JWT to the token object, or null if not found.
export const accessTokenCache = new LRUMap<string, Tokens | null>(env.ACCOUNT_CAHCE_SIZE);

interface GetAccessTokenParams {
  jwt: string;
}

export const getAccessToken = async ({
  jwt,
}: GetAccessTokenParams): Promise<Tokens | null> => {
  const cached = accessTokenCache.get(jwt);
  if (cached) {
    return cached;
  }

  const accessToken = await getToken(jwt);
  accessTokenCache.set(jwt, accessToken);
  return accessToken;
};
