import { createThirdwebClient } from "thirdweb";
import { env } from "./env.js";
import { setThirdwebDomains } from "thirdweb/utils";
import {
  THIRDWEB_BUNDLER_DOMAIN,
  THIRDWEB_INAPP_WALLET_DOMAIN,
  THIRDWEB_PAY_DOMAIN,
  THIRDWEB_RPC_DOMAIN,
  THIRDWEB_SOCIAL_API_DOMAIN,
  THIRDWEB_STORAGE_DOMAIN,
} from "../constants/urls.js";

setThirdwebDomains({
  rpc: THIRDWEB_RPC_DOMAIN,
  inAppWallet: THIRDWEB_INAPP_WALLET_DOMAIN,
  pay: THIRDWEB_PAY_DOMAIN,
  storage: THIRDWEB_STORAGE_DOMAIN,
  social: THIRDWEB_SOCIAL_API_DOMAIN,
  bundler: THIRDWEB_BUNDLER_DOMAIN,
});

export const thirdwebClient = createThirdwebClient({
  secretKey: env.THIRDWEB_API_SECRET_KEY,
  config: {
    rpc: { maxBatchSize: 50 },
  },
});

export const thirdwebClientId = thirdwebClient.clientId;

// /**
//  * Helper functions to handle v4 -> v5 SDK migration.
//  */

// export const fromTransactionStatus = (status: "success" | "reverted") =>
//   status === "success" ? 1 : 0;

// export const fromTransactionType = (type: TransactionReceipt["type"]) => {
//   if (type === "legacy") return 0;
//   if (type === "eip1559") return 1;
//   if (type === "eip2930") return 2;
//   if (type === "eip4844") return 3;
//   if (type === "eip7702") return 4;
//   throw new Error(`Unexpected transaction type ${type}`);
// };

// export const toTransactionType = (value: number) => {
//   if (value === 0) return "legacy";
//   if (value === 1) return "eip1559";
//   if (value === 2) return "eip2930";
//   if (value === 3) return "eip4844";
//   if (value === 4) return "eip7702";
//   throw new Error(`Unexpected transaction type number ${value}`);
// };
