import { prisma } from "../client";

interface UpdateTokenParams {
  id: string;
  label?: string;
}

export const updateToken = async ({ id, label }: UpdateTokenParams) => {
  await prisma.tokens.update({
    where: {
      id,
    },
    data: {
      label,
    },
  });
};
