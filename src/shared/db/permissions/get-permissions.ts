import { Permission } from "../../schemas/auth.js";
import { env } from "../../utils/env.js";
import { prisma } from "../client.js";

interface GetPermissionsParams {
  walletAddress: string;
}

export const getPermissions = async ({
  walletAddress,
}: GetPermissionsParams) => {
  const permissions = await prisma.permissions.findUnique({
    where: {
      walletAddress: walletAddress.toLowerCase(),
    },
  });

  // If the admin wallet isn't in the permissions table yet, add it
  if (
    !permissions &&
    walletAddress.toLowerCase() === env.ADMIN_WALLET_ADDRESS.toLowerCase()
  ) {
    return prisma.permissions.create({
      data: {
        walletAddress: walletAddress.toLowerCase(),
        permissions: Permission.Admin,
      },
    });
  }

  return permissions;
};
