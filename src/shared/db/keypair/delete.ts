import type { Keypairs } from "@prisma/client";
import { prisma } from "../client";

export const deleteKeypair = async ({
  hash,
}: {
  hash: string;
}): Promise<Keypairs> => {
  return prisma.keypairs.delete({
    where: { hash },
  });
};
