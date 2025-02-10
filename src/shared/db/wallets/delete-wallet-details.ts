import type { Address } from "thirdweb";
import { prisma } from "../client.js";

export const deleteWalletDetails = async (walletAddress: Address) => {
  return prisma.walletDetails.delete({
    where: {
      address: walletAddress.toLowerCase(),
    },
  });
};
