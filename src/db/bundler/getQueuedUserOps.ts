import { BundlerUserOperations } from "@prisma/client";
import { PrismaTransaction } from "../../schema/prisma";
import { getPrismaWithPostgresTx } from "../client";

interface GetQueuedUserOpsParams {
  pgtx?: PrismaTransaction;
}

export const getQueuedUserOps = async ({ pgtx }: GetQueuedUserOpsParams) => {
  const prisma = getPrismaWithPostgresTx(pgtx);

  const userOps = await prisma.$queryRaw<BundlerUserOperations[]>`
  SELECT
    *
  FROM
    "bundler_user_operations"
  WHERE
    "sentAt" IS NULL
  ORDER BY
    "queuedAt"
  ASC
  FOR UPDATE SKIP LOCKED
  `;

  return userOps;
};
