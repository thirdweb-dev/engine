import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { env } from "../../shared/utils/env";
import { StatusCodes } from "http-status-codes";

export function withEnforceEngineMode(server: FastifyInstance) {
  switch (env.ENGINE_MODE) {
    case "lite":
      server.addHook("onRequest", enforceLiteMode);
      break;
    case "sandbox":
      server.addHook("onRequest", enforceSandboxMode);
      break;
  }
}

const ALLOWED_LITE_MODE_PATHS_GET = new Set(["/backend-wallet/lite/:teamId"]);
const ALLOWED_LITE_MODE_PATHS_POST = new Set([
  "/backend-wallet/lite/:teamId",
  "/backend-wallet/sign-message",
]);
async function enforceLiteMode(request: FastifyRequest, reply: FastifyReply) {
  if (request.routeOptions.url) {
    if (request.method === "GET") {
      if (ALLOWED_LITE_MODE_PATHS_GET.has(request.routeOptions.url)) {
        return;
      }
    } else if (request.method === "POST") {
      if (ALLOWED_LITE_MODE_PATHS_POST.has(request.routeOptions.url)) {
        return;
      }
    }
  }

  return reply.status(StatusCodes.FORBIDDEN).send({
    statusCode: StatusCodes.FORBIDDEN,
    message: "Engine is in lite mode. Only limited endpoints are allowed.",
    error: "ENGINE_MODE_FORBIDDEN",
  });
}

async function enforceSandboxMode(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  if (request.method !== "GET") {
    return reply.status(StatusCodes.FORBIDDEN).send({
      statusCode: StatusCodes.FORBIDDEN,
      message: "Engine is in sandbox mode. Only GET requests are allowed.",
      error: "ENGINE_MODE_FORBIDDEN",
    });
  }
}
