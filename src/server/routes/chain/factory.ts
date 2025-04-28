import { createFactory } from "hono/factory";
import type { ThirdwebClient } from "thirdweb";

export const onchainRoutesFactory = createFactory<{
  Variables: {
    thirdwebClient?: ThirdwebClient;
    thirdwebServiceKey?: string;
    thirdwebClientId?: string;
    thirdwebSecretKey?: string;
  };
}>();
