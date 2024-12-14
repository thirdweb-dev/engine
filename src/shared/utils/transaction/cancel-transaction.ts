import {
  type Address,
  createThirdwebClient,
  toSerializableTransaction,
} from "thirdweb";
import { getAccount } from "../account";
import { getChain } from "../chain";
import { getChecksumAddress } from "../primitive-types";
import type { TransactionCredentials } from "../../lib/transaction/transaction-credentials";

interface CancellableTransaction {
  chainId: number;
  from: Address;
  nonce: number;
  credentials: TransactionCredentials;
}

export const sendCancellationTransaction = async (
  transaction: CancellableTransaction,
) => {
  const { chainId, from, nonce, credentials } = transaction;

  const chain = await getChain(chainId);
  const populatedTransaction = await toSerializableTransaction({
    from: getChecksumAddress(from),
    transaction: {
      client: createThirdwebClient({
        secretKey: credentials.thirdwebSecretKey,
      }),
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

  const account = await getAccount({
    chainId,
    from,
    credentials,
  });
  const { transactionHash } =
    await account.sendTransaction(populatedTransaction);

  return transactionHash;
};
