import { createFactory } from "hono/factory";
import type { ThirdwebClient } from "thirdweb";

export const contractRoutesFactory = createFactory<{
  Variables: {
    thirdwebClient?: ThirdwebClient;
  };
}>(); 