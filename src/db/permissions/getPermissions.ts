import { prisma } from "../client";

interface GetPermissionsParams {
  walletAddress: string;
}

export const getPermissions = async ({
  walletAddress,
}: GetPermissionsParams) => {
  return prisma.permissions.findUnique({
    where: {
      walletAddress: walletAddress.toLowerCase(),
    },
  });
};
