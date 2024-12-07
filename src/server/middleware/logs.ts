import type { FastifyInstance } from "fastify";
import { stringify } from "thirdweb/utils";
import { logger } from "../../shared/utils/logger";
import { ADMIN_QUEUES_BASEPATH } from "./adminRoutes";
import { OPENAPI_ROUTES } from "./openApi";

const SKIP_LOG_PATHS = new Set([
  "",
  "/",
  "/favicon.ico",
  "/system/health",
  "/static",
  ...OPENAPI_ROUTES,
  // Skip these routes case of importing sensitive details.
  "/backend-wallet/import",
  "/configuration/wallets",
]);

export function withRequestLogs(server: FastifyInstance) {
  server.addHook("onSend", async (request, reply, payload) => {
    if (
      request.method === "OPTIONS" ||
      !request.routeOptions.url ||
      SKIP_LOG_PATHS.has(request.routeOptions.url) ||
      request.routeOptions.url.startsWith(ADMIN_QUEUES_BASEPATH)
    ) {
      return payload;
    }

    const { method, routeOptions, headers, params, query, body } = request;
    const { statusCode, elapsedTime } = reply;
    const isError = statusCode >= 400;

    const extractedHeaders = {
      "x-backend-wallet-address": headers["x-backend-wallet-address"],
      "x-idempotency-key": headers["x-idempotency-key"],
      "x-account-address": headers["x-account-address"],
      "x-account-factory-address": headers["x-account-factory-address"],
      "x-account-salt": headers["x-account-salt"],
    };

    const paramsStr =
      params && Object.keys(params).length
        ? `params=${stringify(params)}`
        : undefined;
    const queryStr =
      query && Object.keys(query).length
        ? `querystring=${stringify(query)}`
        : undefined;
    const bodyStr =
      body && Object.keys(body).length ? `body=${stringify(body)}` : undefined;
    const payloadStr = isError ? `payload=${payload}` : undefined;

    logger({
      service: "server",
      level: isError ? "error" : "info",
      message: [
        `[Request complete - ${statusCode}]`,
        `method=${method}`,
        `path=${routeOptions.url}`,
        `headers=${stringify(extractedHeaders)}`,
        paramsStr,
        queryStr,
        bodyStr,
        `duration=${elapsedTime.toFixed(1)}ms`,
        payloadStr,
      ].join(" "),
    });

    return payload;
  });
}
