import type { Prisma } from "@prisma/client";
import { PrismaTransaction } from "../../schema/prisma";
import { getPrismaWithPostgresTx } from "../client";
import { getWalletDetails } from "../wallets/getWalletDetails";
import { TransactionError } from "@thirdweb-dev/sdk";
import { getSdk } from "../../utils/cache/getSdk";
import { ethers } from "ethers";

type QueueTxRawParams = Omit<
  Prisma.TransactionsCreateInput,
  "fromAddress" | "signerAddress"
> & {
  pgtx?: PrismaTransaction;
  simulateTx?: boolean;
} & (
    | {
      fromAddress: string;
      signerAddress?: never;
    }
    | {
      fromAddress?: never;
      signerAddress: string;
    }
  );

export const queueTxRaw = async ({
  simulateTx = false,
  pgtx,
  ...tx
}: QueueTxRawParams) => {
  const prisma = getPrismaWithPostgresTx(pgtx);

  const walletDetails = await getWalletDetails({
    pgtx,
    address: (tx.fromAddress || tx.signerAddress) as string,
  });

  if (!walletDetails) {
    throw new Error(
      `No backend wallet found with address ${tx.fromAddress || tx.signerAddress
      }`,
    );
  }

  try {
    if (simulateTx) {
      const sdk = await getSdk({ pgtx, chainId: parseInt(tx.chainId) })
      const simulationResult = await sdk.getProvider().call({
        to: `${tx.toAddress}`,
        from: `${tx.fromAddress}`,
        data: `${tx.data}`,
        value: `${tx.value}`,
      });
      if (simulationResult.length > 2) { // '0x' is the success result value
        const decoded = ethers.utils.defaultAbiCoder.decode(
          ["string"],
          ethers.utils.hexDataSlice(simulationResult, 4)
        );
        throw new Error(decoded[0])
      }
    }
  } catch (err: any) {
    const errorMessage =
      (err as TransactionError)?.reason || (err as any).message || err;
    throw new Error(
      `Transaction simulation failed with reason: ${errorMessage}`,
    );
  }


  return prisma.transactions.create({
    data: {
      ...tx,
      fromAddress: tx.fromAddress?.toLowerCase(),
      toAddress: tx.toAddress?.toLowerCase(),
      target: tx.target?.toLowerCase(),
      signerAddress: tx.signerAddress?.toLowerCase(),
      accountAddress: tx.accountAddress?.toLowerCase(),
    },
  });
};
