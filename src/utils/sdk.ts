import { sha256HexSync } from "@thirdweb-dev/crypto";
import { createThirdwebClient } from "thirdweb";
import { env } from "./env";

export const thirdwebClientId = sha256HexSync(
  env.THIRDWEB_API_SECRET_KEY,
).slice(0, 32);

export const thirdwebClient = createThirdwebClient({
  secretKey: env.THIRDWEB_API_SECRET_KEY,
  config: {
    rpc: {
      maxBatchSize: env.SDK_BATCH_SIZE_LIMIT,
      batchTimeoutMs: env.SDK_BATCH_TIME_LIMIT,
    },
  },
});
