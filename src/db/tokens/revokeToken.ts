import { parseJWT } from "@thirdweb-dev/auth";
import { prisma } from "../client";

interface RevokeTokenParams {
  jwt: string;
}

export const revokeToken = async ({ jwt }: RevokeTokenParams) => {
  const { payload } = parseJWT(jwt);
  await prisma.tokens.update({
    where: {
      id: payload.jti,
    },
    data: {
      revokedAt: new Date(),
    },
  });
};
