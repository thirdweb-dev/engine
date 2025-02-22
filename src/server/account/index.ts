import { Hono } from "hono";
export const accountRouter = new Hono();

import { sendTransactionRoute } from "./send-transaction";
import { thirdwebClientMiddleware } from "../middleware/thirdweb-client";

accountRouter.use(thirdwebClientMiddleware);
accountRouter.post("/send-transaction", ...sendTransactionRoute);
