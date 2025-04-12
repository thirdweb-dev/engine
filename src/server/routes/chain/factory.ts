import { createFactory } from "hono/factory";
import type { ThirdwebClient } from "thirdweb";

export const onchainRoutesFactory = createFactory<{
  Variables: {
    thirdwebClient?: ThirdwebClient;
  };
}>();
