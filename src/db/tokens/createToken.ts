import { parseJWT } from "@thirdweb-dev/auth";
import { prisma } from "../client";

interface CreateTokenParams {
  jwt: string;
  isAccessToken: boolean;
}

export const createToken = async ({
  jwt,
  isAccessToken,
}: CreateTokenParams) => {
  const { payload } = parseJWT(jwt);
  await prisma.tokens.create({
    data: {
      id: payload.jti,
      tokenMask: jwt.slice(0, 10) + "..." + jwt.slice(-10),
      walletAddress: payload.sub,
      expiresAt: new Date(payload.exp * 1000),
      isAccessToken,
    },
  });
};
