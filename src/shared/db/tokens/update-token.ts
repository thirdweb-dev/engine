import { prisma } from "../client.js";

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
