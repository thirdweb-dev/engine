import type { Address } from "thirdweb";
import { prisma } from "../client";

export const deleteWalletDetails = async (walletAddress: Address) => {
  return prisma.walletDetails.delete({
    where: {
      address: walletAddress.toLowerCase(),
    },
  });
};
