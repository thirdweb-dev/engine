import { ethers } from "ethers";
import { getSdk } from "../../utils/cache/getSdk";
import { DeployTransaction, Transaction, TransactionError } from "@thirdweb-dev/sdk";

type SimulateTxRawParams = {
  chainId: string;
  toAddress?: string | null;
  fromAddress?: string | null;
  data?: string | null;
  value?: any;
}

const simulateTxRaw = async (args: SimulateTxRawParams) => {
  const sdk = await getSdk({ chainId: parseInt(args.chainId) })
  const simulateResult = await sdk.getProvider().call({
    to: `${args.toAddress}`,
    from: `${args.fromAddress}`,
    data: `${args.data}`,
    value: `${args.value}`,
  });
  if (simulateResult.length > 2) { // '0x' is the success result value
    const decoded = ethers.utils.defaultAbiCoder.decode(
      ["string"],
      ethers.utils.hexDataSlice(simulateResult, 4)
    );
    throw new Error(decoded[0])
  }
}

export type SimulateTxParams = {
  tx?: Transaction<any> | DeployTransaction;
  txRaw?: SimulateTxRawParams
}

export const simulateTx = async ({ tx, txRaw }: SimulateTxParams) => {
  try {
    if (tx) {
      await tx.simulate();
    } else if (txRaw) {
      await simulateTxRaw(txRaw);
    } else {
      throw new Error("No transaction to simulate");
    }
  } catch (err) {
    const errorMessage =
      (err as TransactionError)?.reason || (err as any).message || err;
    throw new Error(
      `Transaction simulate failed with reason: ${errorMessage}`,
    );
  }
}