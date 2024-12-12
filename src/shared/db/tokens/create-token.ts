import { parseJWT } from "@thirdweb-dev/auth";
import { prisma } from "../client";

interface CreateTokenParams {
  jwt: string;
  isAccessToken: boolean;
  label?: string;
}

export const createToken = async ({
  jwt,
  isAccessToken,
  label,
}: CreateTokenParams) => {
  const { payload } = parseJWT(jwt);
  return prisma.tokens.create({
    data: {
      id: payload.jti,
      tokenMask: `${jwt.slice(0, 10)}...${jwt.slice(-10)}`,
      walletAddress: payload.sub,
      expiresAt: new Date(payload.exp * 1000),
      isAccessToken,
      label,
    },
  });
};
