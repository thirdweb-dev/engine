import { PrismaClient } from "@prisma/client";
import { PrismaTransaction } from "../schema/prisma";

export const prisma = new PrismaClient();

export const getPrismaWithPostgresTx = (pgtx?: PrismaTransaction) => {
  return pgtx || prisma;
};
