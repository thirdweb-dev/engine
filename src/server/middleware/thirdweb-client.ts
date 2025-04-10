import { createMiddleware } from "hono/factory";
import { getThirdwebClient } from "../../lib/thirdweb-client.js";

export const thirdwebClientMiddleware = createMiddleware(async (c, next) => {
  const thirdwebSecretKey = c.req.header("x-thirdweb-secret-key");

  if (thirdwebSecretKey) {
    const thirdwebClient = getThirdwebClient(thirdwebSecretKey);
    c.set("thirdwebClient", thirdwebClient);
  }

  await next();
});
