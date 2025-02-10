import type { Keypairs } from "@prisma/client";
import { prisma } from "../client.js";

export const deleteKeypair = async ({
  hash,
}: {
  hash: string;
}): Promise<Keypairs> => {
  return prisma.keypairs.delete({
    where: { hash },
  });
};
