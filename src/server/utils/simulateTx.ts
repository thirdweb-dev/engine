import {
  DeployTransaction,
  Transaction,
  TransactionError,
} from "@thirdweb-dev/sdk";
import { Hex, defineChain, getAddress, simulateTransaction } from "thirdweb";
import { thirdwebClient } from "../../utils/sdk";
import { createCustomError } from "../middleware/error";
import { getChainIdFromChain } from "./chain";

type SimulateTxRawParams = {
  chainId: string;
  toAddress?: string | null;
  fromAddress?: string | null;
  data?: string | null;
  value?: any;
};

const simulateTxRaw = async (args: SimulateTxRawParams) => {
  const { chainId, toAddress, fromAddress, data, value } = args;
  const chainIdParsed = await getChainIdFromChain(chainId);

  if (!toAddress) throw new Error("toAddress is required");
  if (!fromAddress) throw new Error("fromAddress is required");

  // simulateTransaction throws if transaction reverts
  const simulateResult = await simulateTransaction({
    transaction: {
      chain: defineChain(chainIdParsed),
      to: getAddress(toAddress),
      data: data as Hex,
      client: thirdwebClient,
    },
    from: getAddress(fromAddress),
  });

  return simulateResult;
};

export type SimulateTxParams = {
  tx?: Transaction<any> | DeployTransaction;
  txRaw?: SimulateTxRawParams;
};

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
    throw createCustomError(
      `Transaction simulation failed with reason: ${errorMessage}`,
      400,
      "BAD_REQUEST",
    );
  }
};
