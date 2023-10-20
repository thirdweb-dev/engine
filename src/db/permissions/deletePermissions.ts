import { prisma } from "../client";

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
