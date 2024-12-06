import { Keypairs } from "@prisma/client";
import { createHash } from "crypto";
import { KeypairAlgorithm } from "../../server/schemas/keypairs";
import { prisma } from "../client";

export const insertKeypair = async ({
  publicKey,
  algorithm,
  label,
}: {
  publicKey: string;
  algorithm: KeypairAlgorithm;
  label?: string;
}): Promise<Keypairs> => {
  const hash = createHash("sha256").update(publicKey).digest("hex");

  return prisma.keypairs.create({
    data: {
      hash,
      publicKey,
      algorithm,
      label,
    },
  });
};
