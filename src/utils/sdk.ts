import { sha256HexSync } from "@thirdweb-dev/crypto";
import { createThirdwebClient } from "thirdweb";
import { TransactionReceipt } from "thirdweb/dist/types/transaction/types";
import { env } from "./env";

export const thirdwebClientId = sha256HexSync(
  env.THIRDWEB_API_SECRET_KEY,
).slice(0, 32);

export const thirdwebClient = createThirdwebClient({
  secretKey: env.THIRDWEB_API_SECRET_KEY,
  config: {
    rpc: { maxBatchSize: 50 },
  },
});

/**
 * Helper functions to handle v4 -> v5 SDK migration.
 */

export const toTransactionStatus = (status: "success" | "reverted"): number =>
  status === "success" ? 1 : 0;

export const toTransactionType = (type: TransactionReceipt["type"]): number => {
  if (type === "legacy") return 0;
  if (type === "eip1559") return 1;
  if (type === "eip2930") return 2;
  if (type === "eip4844") return 3;
  if (type === "eip7702") return 4;
  throw new Error(`Unexpected transaction type ${type}`);
};
