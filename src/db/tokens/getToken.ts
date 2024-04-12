import { parseJWT } from "@thirdweb-dev/auth";
import { prisma } from "../client";

export const getToken = async (jwt: string) => {
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
