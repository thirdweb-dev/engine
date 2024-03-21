import { parseJWT } from "@thirdweb-dev/auth";
import { prisma } from "../client";

interface GetTokenParams {
  jwt: string;
}

export const getToken = async ({ jwt }: GetTokenParams) => {
  const { payload } = parseJWT(jwt);
  if (payload.jti) {
    return prisma.tokens.findUnique({
      where: {
        id: payload.jti,
      },
    });
  }
  return null;
};
