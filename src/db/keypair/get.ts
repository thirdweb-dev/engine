import type { Keypairs } from "@prisma/client";
import { createHash } from "node:crypto";
import { prisma } from "../client";

export const getKeypairByHash = async (
  hash: string,
): Promise<Keypairs | null> => {
  return prisma.keypairs.findUnique({
    where: { hash },
  });
};

export const getKeypairByPublicKey = async (
  publicKey: string,
): Promise<Keypairs | null> => {
  const hash = createHash("sha256").update(publicKey).digest("hex");
  return getKeypairByHash(hash);
};
