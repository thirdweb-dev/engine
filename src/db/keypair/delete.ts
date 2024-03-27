import { Keypairs } from "@prisma/client";
import { createHash } from "crypto";
import { prisma } from "../client";

export const deleteKeypair = async ({
  publicKey,
}: {
  publicKey: string;
}): Promise<Keypairs> => {
  const hash = createHash("sha256").update(publicKey).digest("hex");

  return prisma.keypairs.delete({
    where: { hash },
  });
};
