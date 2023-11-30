import { getQueuedUserOps } from "../../db/bundler/getQueuedUserOps";
import { prisma } from "../../db/client";
import { getSdk } from "../../utils/cache/getSdk";

export const bundleUserOps = async () => {
  await prisma.$transaction(async (pgtx) => {
    const userOps = await getQueuedUserOps({ pgtx });

    const userOpsByWallet = userOps.reduce((acc, userOp) => {
      const key = `${userOp.backendWalletAddress}-${userOp.entrypointAddress}`;
      if (!acc[userOp.entrypointAddress]) {
        acc[userOp.entrypointAddress] = [];
      }

      acc[userOp.entrypointAddress].push(userOp);

      return acc;
    }, {} as Record<string, typeof userOps>);

    Object.keys(userOpsByWallet).map(async (key) => {
      const userOps = userOpsByWallet[key];
      const [backendWalletAddress, entrypointAddress] = key.split("-");

      const sdk = await getSdk({
        chain: parseInt(userOps[0].chainId),
        walletAddress: backendWalletAddress,
      });
    });
  });
};
