import { prisma } from "../client.js";

interface CreatePermissionsParams {
  walletAddress: string;
  permissions: string;
  label?: string;
}

export const updatePermissions = async ({
  walletAddress,
  permissions,
  label,
}: CreatePermissionsParams) => {
  return prisma.permissions.upsert({
    where: {
      walletAddress: walletAddress.toLowerCase(),
    },
    create: {
      walletAddress: walletAddress.toLowerCase(),
      permissions,
      label,
    },
    update: {
      permissions,
      label,
    },
  });
};
