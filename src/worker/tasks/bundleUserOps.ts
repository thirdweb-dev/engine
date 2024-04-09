import { EntrypointAbi } from "../../constants/bundler";
import { getQueuedUserOps } from "../../db/bundler/getQueuedUserOps";
import { prisma } from "../../db/client";
import { queueTx } from "../../db/transactions/queueTx";
import { getSdk } from "../../utils/cache/getSdk";
import { logger } from "../../utils/logger";

export const bundleUserOps = async () => {
  await prisma.$transaction(async (pgtx) => {
    const userOps = await getQueuedUserOps({ pgtx });

    const userOpsByWallet = userOps.reduce((acc, userOp) => {
      const key = `${userOp.backendWalletAddress}-${userOp.chainId}-${userOp.entrypointAddress}`;
      if (!acc[key]) {
        acc[key] = [];
      }

      acc[key].push(userOp);

      return acc;
    }, {} as Record<string, typeof userOps>);

    await Promise.all(
      Object.keys(userOpsByWallet).map(async (key) => {
        const userOps = userOpsByWallet[key];
        const [backendWalletAddress, chainId, entrypointAddress] =
          key.split("-");

        const sdk = await getSdk({
          chainId: parseInt(chainId),
          walletAddress: backendWalletAddress,
        });

        const entrypoint = await sdk.getContractFromAbi(
          entrypointAddress,
          EntrypointAbi,
        );

        logger({
          service: "worker",
          level: "info",
          message: `Sending ${userOps.length} user ops to entrypoint ${entrypointAddress} on chain id ${chainId} for wallet ${backendWalletAddress}`,
        });

        const tx = entrypoint.prepare("handleOps", [
          userOps, // user ops
          backendWalletAddress, // beneficiary
        ]);

        await queueTx({
          pgtx,
          chainId: parseInt(chainId),
          tx,
          extension: "entrypoint",
        });

        await pgtx.bundlerUserOperations.updateMany({
          where: {
            id: {
              in: userOps.map((userOp) => userOp.id),
            },
          },
          data: {
            sentAt: new Date(),
          },
        });
      }),
    );
  });
};
