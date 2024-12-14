import type { FastifyRequest } from "fastify";
import { env } from "../../utils/env";
import { createCustomError } from "../../../server/middleware/error";
import { StatusCodes } from "http-status-codes";
import { toClientId } from "../../utils/sdk";
import assert from "node:assert";

// DEBUG: TODO NAME THIS BETTER
export interface TransactionCredentials {
  encryptionPassword: string;
  thirdwebSecretKey: string;
  clientId: string;
}

export function getTransactionCredentials(
  req: FastifyRequest,
): TransactionCredentials {
  let encryptionPassword: string;
  let thirdwebSecretKey: string;

  // If "lite" mode, the encryption password + secret key must be provided.
  if (env.ENGINE_MODE === "lite") {
    assert(
      req.authentication.type === "lite",
      "Missing lite mode auth headers.",
    );
    encryptionPassword = req.authentication.litePassword;
    thirdwebSecretKey = req.authentication.thirdwebSecretKey;
  } else {
    encryptionPassword = env.ENCRYPTION_PASSWORD;
    thirdwebSecretKey = env.THIRDWEB_API_SECRET_KEY;
  }

  return {
    encryptionPassword,
    thirdwebSecretKey,
    clientId: toClientId(env.THIRDWEB_API_SECRET_KEY),
  };
}
