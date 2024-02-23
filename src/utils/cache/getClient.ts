import { createThirdwebClient } from "thirdweb";
import { env } from "../env";

export const client = createThirdwebClient({
  secretKey: env.THIRDWEB_API_SECRET_KEY,
});
