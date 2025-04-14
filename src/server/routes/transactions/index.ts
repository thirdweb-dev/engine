import { Hono } from "hono";
import { analyticsHandler, analyticsSummaryHandler } from "./analytics.js";
import { getTransactionsHandler, searchTransactionsHandler } from "./search.js";

export const transactionsRoutes = new Hono();

transactionsRoutes.get("/", ...getTransactionsHandler);
transactionsRoutes.post("/analytics", ...analyticsHandler);
transactionsRoutes.post("/analytics-summary", ...analyticsSummaryHandler);
transactionsRoutes.post("/search", ...searchTransactionsHandler);
