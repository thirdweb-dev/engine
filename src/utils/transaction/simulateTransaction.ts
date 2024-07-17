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
import { Account } from "thirdweb/wallets";
import { getAccount } from "../account";
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
    try {
      // Resolve Target Contract
      const targetContract = getContract({
        client: thirdwebClient,
        chain,
        address: target as Address,
      });

      // Prepare UserOperation Transaction
      transaction = prepareContractCall({
        contract: targetContract,
        method: await resolveMethod(functionName),
        params: functionArgs ?? [],
        value: value,
        gas: gas,
      });
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
    let account: Account | undefined;
    if (from && accountAddress) {
      account = await getSmartWalletV5({
        from,
        chain,
        accountAddress,
      });
    } else {
      account = await getAccount({
        chainId,
        from,
      });
    }

    // Always use an account to simulate the transaction.
    // to catch any errors related to funds
    await simulateTransaction({ transaction, account });
    return null;
  } catch (e: any) {
    return `message : ${e.message} - code: ${e.code}`;
  }
};
