import assert from "node:assert";
import { eth_getTransactionReceipt, getRpcClient } from "thirdweb";
import type { UserOperationReceipt } from "thirdweb/dist/types/wallets/smart/types";
import type { TransactionReceipt } from "thirdweb/transaction";
import { getUserOpReceiptRaw } from "thirdweb/wallets/smart";
import { getChain } from "../../utils/chain";
import { thirdwebClient } from "../../utils/sdk";
import type { AnyTransaction } from "../../utils/transaction/types";

/**
 * Returns the transaction receipt for a given transaction, or null if not found.
 * @param transaction
 * @returns TransactionReceipt | null
 */
export async function getTransactionReceiptFromEOATransaction(
  transaction: AnyTransaction,
): Promise<TransactionReceipt | null> {
  assert(!transaction.isUserOp);

  if (!("sentTransactionHashes" in transaction)) {
    return null;
  }

  const rpcRequest = getRpcClient({
    client: thirdwebClient,
    chain: await getChain(transaction.chainId),
  });

  const results = await Promise.allSettled(
    transaction.sentTransactionHashes.map((hash) =>
      eth_getTransactionReceipt(rpcRequest, { hash }),
    ),
  );

  for (const result of results) {
    if (result.status === "fulfilled") {
      return result.value;
    }
  }
  return null;
}

/**
 * Returns the user operation receipt for a given transaction, or null if not found.
 * The transaction receipt is available in the result under `result.receipt`.
 * @param transaction
 * @returns UserOperationReceipt | null
 */
export async function getUserOpReceiptFromTransaction(
  transaction: AnyTransaction,
): Promise<UserOperationReceipt | null> {
  assert(transaction.isUserOp);

  if (!("userOpHash" in transaction)) {
    return null;
  }

  const receipt = await getUserOpReceiptRaw({
    client: thirdwebClient,
    chain: await getChain(transaction.chainId),
    userOpHash: transaction.userOpHash,
  });
  return receipt ?? null;
}
