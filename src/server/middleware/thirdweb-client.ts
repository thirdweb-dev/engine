import { createMiddleware } from "hono/factory";
import { createThirdwebClient } from "thirdweb";
import { env } from "../../lib/env.js";
import { setThirdwebDomains } from "thirdweb/utils";
import {
  THIRDWEB_BUNDLER_DOMAIN,
  THIRDWEB_INAPP_WALLET_DOMAIN,
  THIRDWEB_PAY_DOMAIN,
  THIRDWEB_RPC_DOMAIN,
  THIRDWEB_SOCIAL_API_DOMAIN,
  THIRDWEB_STORAGE_DOMAIN,
} from "../../constants/urls.js";

export const thirdwebClientMiddleware = createMiddleware(async (c, next) => {
  const thirdwebSecretKey = c.req.header("x-thirdweb-secret-key");

  if (thirdwebSecretKey) {
    if (env.NODE_ENV !== "production") {
      // if not on production: run this when creating a client to set the domains
      setThirdwebDomains({
        rpc: THIRDWEB_RPC_DOMAIN,
        inAppWallet: THIRDWEB_INAPP_WALLET_DOMAIN,
        pay: THIRDWEB_PAY_DOMAIN,
        storage: THIRDWEB_STORAGE_DOMAIN,
        social: THIRDWEB_SOCIAL_API_DOMAIN,
        bundler: THIRDWEB_BUNDLER_DOMAIN,
      });
    }
    const thirdwebClient = createThirdwebClient({
      secretKey: thirdwebSecretKey,
    });

    c.set("thirdwebClient", thirdwebClient);
  }

  await next();
});
