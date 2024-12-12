import type { FastifyRequest } from "fastify";
import { env } from "../../utils/env";
import { createCustomError } from "../../../server/middleware/error";
import { StatusCodes } from "http-status-codes";

// DEBUG: TODO NAME THIS BETTER
export interface TransactionCredentials {
  encryptionPassword: string;
  thirdwebSecretKey: string;
}

export function getTransactionCredentials(
  req: FastifyRequest,
): TransactionCredentials {
  // If "lite" mode, the encryption password + secret key must be provided.
  if (env.ENGINE_MODE === "lite") {
    if (req.authentication.type === "lite") {
      return {
        encryptionPassword: req.authentication.litePassword,
        thirdwebSecretKey: req.authentication.thirdwebSecretKey,
      };
    }

    throw createCustomError(
      "Unauthorized.",
      StatusCodes.UNAUTHORIZED,
      "UNAUTHORIZED",
    );
  }

  return {
    encryptionPassword: env.ENCRYPTION_PASSWORD,
    thirdwebSecretKey: env.THIRDWEB_API_SECRET_KEY,
  };
}
