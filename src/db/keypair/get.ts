import { Keypairs } from "@prisma/client";
import { createHash } from "crypto";
import { prisma } from "../client";

export const _getKeypair = async ({
  publicKey,
}: {
  publicKey: string;
}): Promise<Keypairs | null> => {
  const hash = createHash("sha256").update(publicKey).digest("hex");

  return prisma.keypairs.findUnique({
    where: { hash },
  });
};
