import { Keypairs } from "@prisma/client";
import { createHash } from "crypto";
import { prisma } from "../client";

export const insertKeypair = async ({
  publicKey,
}: {
  publicKey: string;
}): Promise<Keypairs> => {
  const hash = createHash("sha256").update(publicKey).digest("hex");

  return prisma.keypairs.create({
    data: {
      hash,
      publicKey,
    },
  });
};
