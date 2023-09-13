import { WalletDetails } from "@prisma/client";
import { prisma } from "../client";

interface CreateWalletDetailsParams {
  walletDetails: WalletDetails;
}

export const createWalletDetails = async ({
  walletDetails,
}: CreateWalletDetailsParams) => {
  return prisma.walletDetails.create({
    data: walletDetails,
  });
};
