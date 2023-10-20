import { prisma } from "../client";

export const getAccessTokens = async () => {
  return prisma.tokens.findMany({
    where: {
      isAccessToken: true,
      revokedAt: null,
    },
  });
};
