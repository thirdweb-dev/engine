import { createMiddleware } from "hono/factory";
import { createThirdwebClient } from "thirdweb";

export const thirdwebClientMiddleware = createMiddleware(async (c, next) => {
  const thirdwebSecretKey = c.req.header("x-thirdweb-secret-key");

  if (thirdwebSecretKey) {
    const thirdwebClient = createThirdwebClient({
      secretKey: thirdwebSecretKey,
    });

    c.set("thirdwebClient", thirdwebClient);
  }

  await next();
});
