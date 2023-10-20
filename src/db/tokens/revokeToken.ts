import { prisma } from "../client";

interface RevokeTokenParams {
  id: string;
}

export const revokeToken = async ({ id }: RevokeTokenParams) => {
  await prisma.tokens.update({
    where: {
      id,
    },
    data: {
      revokedAt: new Date(),
    },
  });
};
