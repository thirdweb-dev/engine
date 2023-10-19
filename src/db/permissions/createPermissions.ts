import { prisma } from "../client";

interface CreatePermissionsParams {
  walletAddress: string;
  permissions: string;
}

export const createPermissions = async ({
  walletAddress,
  permissions,
}: CreatePermissionsParams) => {
  return prisma.permissions.create({
    data: {
      walletAddress: walletAddress.toLowerCase(),
      permissions,
    },
  });
};
