import { createFactory } from "hono/factory";
import type { ThirdwebClient } from "thirdweb";

export const accountRoutesFactory = createFactory<{
  Variables: {
    thirdwebClient?: ThirdwebClient;
  };
}>();
