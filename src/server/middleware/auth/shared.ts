import { err, ok, type Result } from "neverthrow";
import type { AuthErr, HttpErrStatusCode } from "../../../lib/errors";

export function extractJwt(
  authHeader: string | undefined,
): Result<string, AuthErr> {
  if (!authHeader?.startsWith("Bearer ")) {
    return err({
      kind: "auth",
      code: "missing_auth_header",
      status: 401,
    });
  }

  const jwt = authHeader.split(" ")[1];

  if (!jwt) {
    return err({
      kind: "auth",
      code: "malformed_auth_header",
      status: 401 as HttpErrStatusCode,
    });
  }
  return ok(jwt);
}

export function mapJwtError(error: string | Error | unknown): AuthErr {
  const message = error instanceof Error ? error.message : String(error);

  // Categorize standard JWT validation errors
  if (message.includes("Invalid JWT ID")) {
    return {
      kind: "auth",
      code: "invalid_jwt",
      status: 401,
      message: "Invalid JWT ID",
    } as const;
  }

  if (message.includes("domain")) {
    return {
      kind: "auth",
      code: "invalid_jwt",
      status: 401,
      message: "Invalid token domain",
    } as const;
  }

  if (message.includes("expired")) {
    return {
      kind: "auth",
      code: "expired_jwt",
      status: 401,
      message: "Token has expired",
    } as const;
  }

  if (message.includes("invalid before")) {
    return {
      kind: "auth",
      code: "invalid_jwt",
      status: 401,
      message: "Token not yet valid",
    } as const;
  }

  if (message.includes("issuer address")) {
    return {
      kind: "auth",
      code: "invalid_signature",
      status: 401,
      message: "Invalid token issuer",
    } as const;
  }

  // Default case for unknown errors
  return {
    kind: "auth",
    code: "invalid_jwt",
    status: 401,
    source: error instanceof Error ? error : undefined,
  } as const;
}
