import {
  PreparedTransaction,
  defineChain,
  getContract,
  prepareContractCall,
  prepareTransaction,
  resolveMethod,
  simulateTransaction,
} from "thirdweb";
import { thirdwebClient } from "../sdk";
import { QueuedTransaction } from "./types";

/**
 * Simulate the queued transaction.
 * @param queuedTransaction
 * @throws if there is a simulation error
 */
export const simulateQueuedTransaction = async (
  queuedTransaction: QueuedTransaction,
): Promise<string | null> => {
  const {
    chainId,
    to,
    functionName,
    functionArgs,
    data,
    value,
    gas,
    gasPrice,
    maxFeePerGas,
    maxPriorityFeePerGas,
  } = queuedTransaction;

  const chain = defineChain(chainId);

  let transaction: PreparedTransaction;
  // Resolve data.
  if (data) {
    transaction = prepareTransaction({
      client: thirdwebClient,
      chain,
      to,
      data,
      value,
      gas,
      gasPrice,
      maxFeePerGas,
      maxPriorityFeePerGas,
    });
  } else if (to && functionName && functionArgs) {
    const contract = getContract({
      client: thirdwebClient,
      chain,
      address: to,
    });
    transaction = await prepareContractCall({
      contract,
      method: resolveMethod(functionName),
      params: functionArgs,
      value,
      gas,
      gasPrice,
      maxFeePerGas,
      maxPriorityFeePerGas,
    });
  } else {
    throw new Error(
      `Transaction cannot be simulated: ${JSON.stringify(queuedTransaction)}`,
    );
  }

  try {
    await simulateTransaction({ transaction });
    return null;
  } catch (e: any) {
    return e.toString();
  }
};
