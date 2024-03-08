import { createThirdwebClient } from "thirdweb";
import { env } from "../env";

// read-client

export const client = createThirdwebClient({
  secretKey: env.THIRDWEB_API_SECRET_KEY,
  config: {
    rpc: {
      maxBatchSize: env.SDK_BATCH_SIZE_LIMIT,
      batchTimeoutMs: env.SDK_BATCH_TIME_LIMIT,
    },
  },
});

// worker-client
