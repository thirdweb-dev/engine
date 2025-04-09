import { Hono } from "hono";
import { analyticsHandler } from "./analytics";
import { getTransactionsHandler, searchTransactionsHandler } from "./search";

export const transactionsRoutes = new Hono();

transactionsRoutes.get("/", ...getTransactionsHandler);
transactionsRoutes.post("/analytics", ...analyticsHandler);
transactionsRoutes.post("/search", ...searchTransactionsHandler);
