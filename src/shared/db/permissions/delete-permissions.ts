import { prisma } from "../client.js";

interface DeletePermissionsParams {
  walletAddress: string;
}

export const deletePermissions = async ({
  walletAddress,
}: DeletePermissionsParams) => {
  return prisma.permissions.delete({
    where: {
      walletAddress: walletAddress.toLowerCase(),
    },
  });
};
