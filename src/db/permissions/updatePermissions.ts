import { prisma } from "../client";

interface CreatePermissionsParams {
  walletAddress: string;
  permissions: string;
}

export const updatePermissions = async ({
  walletAddress,
  permissions,
}: CreatePermissionsParams) => {
  return prisma.permissions.upsert({
    where: {
      walletAddress: walletAddress.toLowerCase(),
    },
    create: {
      walletAddress: walletAddress.toLowerCase(),
      permissions,
    },
    update: {
      permissions,
    },
  });
};
