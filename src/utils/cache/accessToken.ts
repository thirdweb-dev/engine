import type { Tokens } from "@prisma/client";
import { getToken } from "../../db/tokens/getToken";

// Cache an access token JWT to the token object, or null if not found.
export const accessTokenCache = new Map<string, Tokens | null>();

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
