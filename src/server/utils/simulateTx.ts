import { getChainByChainIdAsync } from "@thirdweb-dev/chains";
import {
  DeployTransaction,
  Transaction,
  TransactionError,
} from "@thirdweb-dev/sdk";
import { prepareTransaction, simulateTransaction } from "thirdweb";
import { InputTransaction } from "../../schema/transaction";
import { thirdwebClient } from "../../utils/sdk";
import { createCustomError } from "../middleware/error";

/**
 * Simulates a transaction.
 * @returns Error message if the simulation fails. Else null.
 */
export const simulateRaw = async (tx: InputTransaction) => {
  if (!tx.toAddress || !tx.fromAddress) {
    return;
  }

  try {
    const chain = await getChainByChainIdAsync(Number(tx.chainId));
    const transaction = prepareTransaction({
      to: tx.toAddress,
      value: tx.value ? BigInt(tx.value) : undefined,
      data: tx.data as `0x${string}`,
      chain: {
        id: Number(tx.chainId),
        rpc: chain.rpc[0],
      },
      client: thirdwebClient,
    });

    await simulateTransaction({
      transaction,
      from: tx.fromAddress,
    });
  } catch (e: any) {
    throw new Error(e?.message || e.toString());
  }
};

interface SimulateParams {
  tx?: Transaction<any> | DeployTransaction;
  txRaw?: InputTransaction;
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
