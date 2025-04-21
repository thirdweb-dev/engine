import { Hono } from "hono";
import { thirdwebClientMiddleware } from "../../middleware/thirdweb-client.js";
import { sendTransactionRoute } from "./transaction.js";
import {
  encodeFunctionDataRoute,
  readFromContractRoute,
  writeToContractRoute,
} from "./contract.js";
import { getNativeBalanceRoute } from "./balance.js";
import {
  signMessageRoute,
  signTransactionRoute,
  signTypedDataRoute,
} from "./sign.js";

export const chainActionsRouter = new Hono();

chainActionsRouter.use(thirdwebClientMiddleware);

// write routes
chainActionsRouter.post("/write/transaction", ...sendTransactionRoute);
chainActionsRouter.post("/write/contract", ...writeToContractRoute);

// read routes
chainActionsRouter.post("/read/contract", ...readFromContractRoute);
chainActionsRouter.post("/read/balance", ...getNativeBalanceRoute);

// encode routes
chainActionsRouter.post("/encode/contract", ...encodeFunctionDataRoute);

// sign routes
chainActionsRouter.post("/sign/transaction", ...signTransactionRoute);
chainActionsRouter.post("/sign/message", ...signMessageRoute);
chainActionsRouter.post("/sign/typed-data", ...signTypedDataRoute);
