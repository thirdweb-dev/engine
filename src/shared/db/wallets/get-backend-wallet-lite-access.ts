import { prisma } from "../client";

export async function getBackendWalletLiteAccess(args: {
  teamId: string;
}) {
  const { teamId } = args;
  return prisma.backendWalletLiteAccess.findFirst({
    where: { teamId },
    include: { account: true },
  });
}
