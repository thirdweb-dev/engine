import type { FastifyRequest } from "fastify";
import type { AuthenticationType } from "../middleware/auth";
import { createCustomError } from "../middleware/error";
import { StatusCodes } from "http-status-codes";

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
