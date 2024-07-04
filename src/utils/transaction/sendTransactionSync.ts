import { Address, defineChain, toSerializableTransaction } from "thirdweb";
import { getAccount } from "../account";
import { thirdwebClient } from "../sdk";

interface CancellableTransaction {
  chainId: number;
  from: Address;
  nonce: number;
}

export const sendRetryTransaction = async (
  transaction: CancellableTransaction,
) => {
  const { chainId, from, nonce } = transaction;

  const chain = defineChain(chainId);
  const populatedTransaction = await toSerializableTransaction({
    from,
    transaction: {
      client: thirdwebClient,
      chain,
      to: from,
      data: "0x",
      value: 0n,
      nonce,
    },
  });

  // Set 2x current gas to prioritize this transaction over any pending one.
  // NOTE: This will not cancel a pending transaction set with higher gas.
  if (populatedTransaction.gasPrice) {
    populatedTransaction.gasPrice *= 2n;
  }
  if (populatedTransaction.maxFeePerGas) {
    populatedTransaction.maxFeePerGas *= 2n;
  }
  if (populatedTransaction.maxFeePerGas) {
    populatedTransaction.maxFeePerGas *= 2n;
  }

  const account = await getAccount({ chainId, from });
  const { transactionHash } = await account.sendTransaction(
    populatedTransaction,
  );
  return transactionHash;
};
