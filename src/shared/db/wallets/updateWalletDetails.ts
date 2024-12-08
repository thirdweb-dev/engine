import { prisma } from "../client";

interface UpdateWalletDetailsParams {
  address: string;
  label?: string;
}

export const updateWalletDetails = async ({
  address,
  label,
}: UpdateWalletDetailsParams) => {
  await prisma.walletDetails.update({
    where: {
      address: address.toLowerCase(),
    },
    data: {
      label,
    },
  });
};
