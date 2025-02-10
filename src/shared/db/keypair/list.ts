import type { Keypairs } from "@prisma/client";
import { prisma } from "../client.js";

export const listKeypairs = async (): Promise<Keypairs[]> => {
  return prisma.keypairs.findMany();
};
