import { PrismaTransaction } from "../../schema/prisma";
import { getPrismaWithPostgresTx, getRedisClient } from "../client";

interface GetWalletDetailsParams {
  pgtx?: PrismaTransaction;
  address: string;
}

export const getWalletDetails = async ({
  pgtx,
  address,
}: GetWalletDetailsParams) => {
  const redisClient = await getRedisClient();
  const walletDetails = await redisClient.hgetall(
    "wallet:" + address.toLowerCase(),
  );

  if (Object.keys(walletDetails).length === 0) {
    const prisma = getPrismaWithPostgresTx(pgtx);

    const walletDetails = await prisma.walletDetails.findUnique({
      where: {
        address: address.toLowerCase(),
      },
    });

    if (walletDetails) {
      await redisClient.hset("wallet:" + address.toLowerCase(), walletDetails);
    }
    return walletDetails;
  }
  return walletDetails;
};
