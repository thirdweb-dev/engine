import { createThirdwebClient } from "thirdweb";
import { env } from "./env.js";
import { setServiceKey, setThirdwebDomains } from "thirdweb/utils";
import {
  THIRDWEB_BUNDLER_DOMAIN,
  THIRDWEB_INAPP_WALLET_DOMAIN,
  THIRDWEB_PAY_DOMAIN,
  THIRDWEB_RPC_DOMAIN,
  THIRDWEB_SOCIAL_API_DOMAIN,
  THIRDWEB_STORAGE_DOMAIN,
} from "../constants/urls.js";

if (env.NODE_ENV !== "production") {
  setThirdwebDomains({
    rpc: THIRDWEB_RPC_DOMAIN,
    inAppWallet: THIRDWEB_INAPP_WALLET_DOMAIN,
    pay: THIRDWEB_PAY_DOMAIN,
    storage: THIRDWEB_STORAGE_DOMAIN,
    social: THIRDWEB_SOCIAL_API_DOMAIN,
    bundler: THIRDWEB_BUNDLER_DOMAIN,
  });
}

export function getThirdwebClient(
  params:
    | { secretKey: string; clientId?: string }
    | { clientId: string; serviceKey: string },
) {
  if ("serviceKey" in params) {
    setServiceKey(params.serviceKey);
  }

  const client = createThirdwebClient({
    ...params,
    config: {
      rpc: { maxBatchSize: 50 },
    },
  });

  return client;
}

export const thirdwebClient = getThirdwebClient({
  secretKey: env.THIRDWEB_API_SECRET_KEY,
});
export const thirdwebClientId = thirdwebClient.clientId;
