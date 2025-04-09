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

export function getThirdwebClient(secretKey: string) {
  return createThirdwebClient({
    secretKey,
    config: {
      rpc: { maxBatchSize: 50 },
    },
  });
}

export const thirdwebClient = getThirdwebClient(env.THIRDWEB_API_SECRET_KEY);
export const thirdwebClientId = thirdwebClient.clientId;
