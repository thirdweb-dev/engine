import { ethers } from "ethers";
import { getSdk } from "../../utils/cache/getSdk";
import { PrismaTransaction } from "../../schema/prisma";
import { DeployTransaction, Transaction, TransactionError } from "@thirdweb-dev/sdk";

type SimulateTxRawParams = {
  pgtx: PrismaTransaction;
  txRaw: {
    toAddress?: string | null;
    fromAddress?: string | null;
    data?: string | null;
    chainId: string;
    value?: any;
  }
}

const simulateTxRaw = async ({ pgtx, txRaw }: SimulateTxRawParams) => {
  const sdk = await getSdk({ pgtx, chainId: parseInt(txRaw.chainId) })
  const simulationResult = await sdk.getProvider().call({
    to: `${txRaw.toAddress}`,
    from: `${txRaw.fromAddress}`,
    data: `${txRaw.data}`,
    value: `${txRaw.value}`,
  });
  if (simulationResult.length > 2) { // '0x' is the success result value
    const decoded = ethers.utils.defaultAbiCoder.decode(
      ["string"],
      ethers.utils.hexDataSlice(simulationResult, 4)
    );
    throw new Error(decoded[0])
  }
}

export type SimulateTxParams = {
  tx?: Transaction<any> | DeployTransaction;
} & Partial<SimulateTxRawParams>;

export const simulateTx = async ({ tx, txRaw, pgtx }: SimulateTxParams) => {
  try {
    if (tx) {
      await tx.simulate();
    } else if (txRaw && pgtx) {
      await simulateTxRaw({ pgtx, txRaw });
    } else {
      throw new Error("No transaction to simulate");
    }
  } catch (err) {
    const errorMessage =
      (err as TransactionError)?.reason || (err as any).message || err;
    throw new Error(
      `Transaction simulation failed with reason: ${errorMessage}`,
    );
  }
}