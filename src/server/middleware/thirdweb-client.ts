import type { Factory } from "hono/factory";
import { getThirdwebClient } from "../../lib/thirdweb-client.js";
import { onchainRoutesFactory } from "../routes/chain/factory.js";
import type { Context } from "hono";

export const thirdwebClientMiddleware = onchainRoutesFactory.createMiddleware(
  async (c, next) => {
    const thirdwebSecretKey = c.req.header("x-thirdweb-secret-key");
    const thirdwebClientId = c.req.header("x-thirdweb-client-id");
    const thirdwebServiceKey = c.req.header("x-thirdweb-service-key");

    if (thirdwebSecretKey) {
      const thirdwebClient = getThirdwebClient({
        secretKey: thirdwebSecretKey,
        clientId: thirdwebClientId,
      });
      c.set("thirdwebClient", thirdwebClient);
    } else if (thirdwebClientId && thirdwebServiceKey) {
      const thirdwebClient = getThirdwebClient({
        clientId: thirdwebClientId,
        serviceKey: thirdwebServiceKey,
      });
      c.set("thirdwebClient", thirdwebClient);
    }

    c.set("thirdwebServiceKey", thirdwebServiceKey);
    c.set("thirdwebClientId", thirdwebClientId);
    c.set("thirdwebSecretKey", thirdwebSecretKey);

    await next();
  },
);

type ExtractEnvFromFactory<F> = F extends Factory<infer E, any> ? E : never;

export function getThirdwebCredentialsFromContext(
  c: Context<ExtractEnvFromFactory<typeof onchainRoutesFactory>>,
) {
  const thirdwebServiceKey = c.get("thirdwebServiceKey");
  const thirdwebClientId = c.get("thirdwebClientId");
  const thirdwebSecretKey = c.get("thirdwebSecretKey");

  return {
    thirdwebServiceKey,
    thirdwebClientId,
    thirdwebSecretKey,
  };
}
