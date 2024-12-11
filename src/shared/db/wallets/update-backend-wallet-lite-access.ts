import { prisma } from "../client";

export async function updateBackendWalletLiteAccess(args: {
  id: string;
  accountAddress: string;
  signerAddress: string;
  encryptedJson: string;
}) {
  const { id, accountAddress, signerAddress, encryptedJson } = args;
  return prisma.backendWalletLiteAccess.update({
    where: { id },
    data: {
      accountAddress,
      signerAddress,
      encryptedJson,
    },
  });
}
