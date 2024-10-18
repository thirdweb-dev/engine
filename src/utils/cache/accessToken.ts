import type { Tokens } from "@prisma/client";
import { LRUMap } from "mnemonist";
import { getToken } from "../../db/tokens/getToken";

// Cache an access token JWT to the token object, or null if not found.
export const accessTokenCache = new LRUMap<string, Tokens | null>(2048);

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
