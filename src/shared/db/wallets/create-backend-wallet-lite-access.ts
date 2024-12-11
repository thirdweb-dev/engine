import type { Address } from "thirdweb";
import { prisma } from "../client";

export async function createBackendWalletLiteAccess(args: {
  teamId: string;
  dashboardUserAddress: Address;
  salt: string;
}) {
  const { teamId, dashboardUserAddress, salt } = args;
  return prisma.backendWalletLiteAccess.create({
    data: {
      teamId,
      dashboardUserAddress,
      salt,
    },
  });
}
