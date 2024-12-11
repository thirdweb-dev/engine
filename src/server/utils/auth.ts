import type { FastifyRequest } from "fastify";
import type { AuthenticationType } from "../middleware/auth";
import { createCustomError } from "../middleware/error";
import { StatusCodes } from "http-status-codes";
import { env } from "node:process";

export function assertAuthenticationType<T extends AuthenticationType>(
  req: FastifyRequest,
  types: T[],
): asserts req is FastifyRequest & {
  authentication: { type: T };
} {
  if (!types.includes(req.authentication.type as T)) {
    throw createCustomError(
      `This endpoint requires authentication type: ${types.join(", ")}`,
      StatusCodes.FORBIDDEN,
      "FORBIDDEN_AUTHENTICATION_TYPE",
    );
  }
}

export function getDecryptionPassword(req: FastifyRequest) {
  if (env.ENGINE_MODE === "lite" && req.authentication.type === "lite") {
    return req.authentication.litePassword;
  }
  return env.ENCRYPTION_PASSWORD;
}
