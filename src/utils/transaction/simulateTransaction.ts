import {
  Address,
  PreparedTransaction,
  defineChain,
  getContract,
  prepareContractCall,
  prepareTransaction,
  resolveMethod,
  simulateTransaction,
} from "thirdweb";
import { getSmartWalletV5 } from "../cache/getSmartWalletV5";
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
    signerAddress,
    accountAddress,
    target,
    from,
  } = queuedTransaction;

  const chain = defineChain(chainId);

  let transaction: PreparedTransaction;
  if (from && accountAddress && signerAddress && target && functionName) {
    // To-do: Add support for UserOperation.
    try {
      // Resolve Target Contract
      const targetContract = getContract({
        client: thirdwebClient,
        chain,
        address: target as Address,
      });

      // Prepare UserOperation Transaction
      const preparedTransaction = prepareContractCall({
        contract: targetContract,
        method: await resolveMethod(functionName),
        params: functionArgs ?? [],
        value: value,
        gas: gas,
      });

      // Get Smart Wallet
      const smartWallet = await getSmartWalletV5({
        from,
        chain,
        accountAddress,
      });

      await simulateTransaction({
        transaction: preparedTransaction,
        account: smartWallet,
      });

      return null;
    } catch (error: any) {
      return error.toString();
    }
  } else if (data) {
    // Resolve data.
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
