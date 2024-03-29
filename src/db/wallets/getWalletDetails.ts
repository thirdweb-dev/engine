import { WalletDetails } from "@prisma/client";
import {
  cacheKeyWalletDetails,
  getCache,
  setCache,
} from "../../utils/redis/cache";
import { getPrismaWithPostgresTx } from "../client";

interface GetWalletDetailsParams {
  address: string;
}

export const getWalletDetails = async ({
  address,
}: GetWalletDetailsParams): Promise<WalletDetails | null> => {
  const key = cacheKeyWalletDetails(address);
  const cached = await getCache<WalletDetails>(key);
  if (cached) {
    return cached;
  }

  const prisma = getPrismaWithPostgresTx();
  const walletDetails = await prisma.walletDetails.findUnique({
    where: {
      address: address.toLowerCase(),
    },
  });

  if (walletDetails) {
    setCache(key, walletDetails);
  }
  return walletDetails;
};
