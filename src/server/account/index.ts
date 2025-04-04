import { Hono } from "hono";
export const accountRouter = new Hono();

import { sendTransactionRoute } from "./send-transaction.js";
import { thirdwebClientMiddleware } from "../middleware/thirdweb-client.js";

accountRouter.use(thirdwebClientMiddleware);
accountRouter.post("/send-transaction", ...sendTransactionRoute);
