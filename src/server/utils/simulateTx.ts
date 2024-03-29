import {
  DeployTransaction,
  Transaction,
  TransactionError,
} from "@thirdweb-dev/sdk";
import { ethers } from "ethers";
import { getSdk } from "../../utils/cache/getSdk";
import { createCustomError } from "../middleware/error";

interface SimulateRawParams {
  chainId: string;
  toAddress?: string | null;
  fromAddress?: string | null;
  data?: string | null;
  value?: any;
}

const simulateRaw = async (args: SimulateRawParams) => {
  const sdk = await getSdk({ chainId: parseInt(args.chainId) });
  const simulateResult = await sdk.getProvider().call({
    to: `${args.toAddress}`,
    from: `${args.fromAddress}`,
    data: `${args.data}`,
    value: `${args.value}`,
  });
  if (simulateResult.length > 2) {
    // '0x' is the success result value
    const decoded = ethers.utils.defaultAbiCoder.decode(
      ["string"],
      ethers.utils.hexDataSlice(simulateResult, 4),
    );
    throw new Error(decoded[0]);
  }
};

interface SimulateParams {
  tx?: Transaction<any> | DeployTransaction;
  txRaw?: SimulateRawParams;
}

export const simulate = async ({ tx, txRaw }: SimulateParams) => {
  try {
    if (tx) {
      await tx.simulate();
    } else if (txRaw) {
      await simulateRaw(txRaw);
    } else {
      throw new Error("No transaction to simulate");
    }
  } catch (err) {
    const errorMessage =
      (err as TransactionError)?.reason || (err as any).message || err;
    throw createCustomError(
      `Transaction simulation failed with reason: ${errorMessage}`,
      400,
      "BAD_REQUEST",
    );
  }
};
