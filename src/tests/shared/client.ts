import { createThirdwebClient } from "thirdweb";

const secretKey = process.env.TW_SECRET_KEY;
if (!secretKey) throw new Error("TW_SECRET_KEY is required");
export const TEST_CLIENT = createThirdwebClient({ secretKey });
