import assert from "node:assert";
import { eth_getTransactionReceipt, getRpcClient } from "thirdweb";

import type { TransactionReceipt } from "thirdweb/transaction";
import { getUserOpReceiptRaw } from "thirdweb/wallets/smart";
import { getChain } from "../../utils/chain.js";
import { thirdwebClient } from "../../utils/sdk.js";
import type { AnyTransaction } from "../../utils/transaction/types.js";

type UserOperationReceipt = Awaited<ReturnType<typeof getUserOpReceiptRaw>>;

/**
 * Returns the transaction receipt for a given transaction, or null if not found.
 * @param transaction
 * @returns TransactionReceipt | null
 */
export async function getReceiptForEOATransaction(
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

  // Get the receipt for each transaction hash (in batches).
  // Return if any receipt is found.
  const BATCH_SIZE = 10;
  for (
    let i = 0;
    i < transaction.sentTransactionHashes.length;
    i += BATCH_SIZE
  ) {
    const batch = transaction.sentTransactionHashes.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map((hash) => eth_getTransactionReceipt(rpcRequest, { hash })),
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        return result.value;
      }
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
export async function getReceiptForUserOp(
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
