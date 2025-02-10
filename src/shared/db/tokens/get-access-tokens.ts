import { prisma } from "../client.js";

export const getAccessTokens = async () => {
  return prisma.tokens.findMany({
    where: {
      isAccessToken: true,
      revokedAt: null,
    },
  });
};
