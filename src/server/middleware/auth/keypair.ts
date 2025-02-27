import { errAsync, okAsync, ResultAsync } from "neverthrow";
import {
  engineErrToHttpException,
  type AuthErr,
  type DbErr,
} from "../../../lib/errors";
import { decode, verify } from "hono/jwt";
import { getKeypair } from "../../../lib/keypairs";
import { createMiddleware } from "hono/factory";
import { env } from "../../../lib/env";
import { HTTPException } from "hono/http-exception";
import { extractJwt } from "./shared";
import type { KeypairDbEntry } from "../../../db/types";
import { createHash } from "node:crypto";

function checkKeypairAuth({
  jwt,
  actualBodyHash,
}: {
  jwt: string;
  actualBodyHash: string;
}): ResultAsync<KeypairDbEntry, AuthErr | DbErr> {
  // First decode without verification to get the keypair info
  const decoded = decode(jwt);

  // Get keypair from our DB
  return getKeypair({
    publicKey: decoded.payload.iss as string,
    publicKeyHash: decoded.header.kid as string,
  })
    .andThrough(() => {
      if (decoded.payload.bodyHash) {
        const actualBodyHashBytes = Buffer.from(actualBodyHash, "hex");
        const expectedBodyHashBytes = Buffer.from(
          decoded.payload.bodyHash as string,
          "hex"
        );

        if (!actualBodyHashBytes.equals(expectedBodyHashBytes)) {
          return errAsync({
            kind: "auth",
            code: "invalid_body_hash",
            status: 401,
          } as AuthErr);
        }
      }

      return okAsync("ok");
    })
    .andThrough((keypair) =>
      // Verify signature with keypair
      ResultAsync.fromPromise(
        // Assuming verifyJWT handles ES256/RS256 etc based on algorithm
        verify(jwt, keypair.publicKey, keypair.algorithm),

        (): AuthErr =>
          ({
            kind: "auth",
            code: "invalid_signature",
            status: 401,
          } as const)
      )
    )
    .mapErr((err) => {
      if (err.kind === "keypair") {
        return {
          kind: "auth",
          code: "invalid_keypair",
          status: 401,
        } as AuthErr;
      }
      return err;
    });
}

export const keypairAuth = createMiddleware(async (c, next) => {
  if (!env.ENABLE_KEYPAIR_AUTH) {
    throw new HTTPException(403, {
      message: "Keypair authentication is not enabled",
    });
  }

  const actualBodyHash = await c.req
    .arrayBuffer()
    .then((buffer) =>
      createHash("sha256").update(new Uint8Array(buffer)).digest("hex")
    );

  const result = await extractJwt(c.req.header("authorization")).asyncAndThen(
    (jwt) => checkKeypairAuth({ jwt, actualBodyHash })
  );

  if (result.isErr()) {
    throw engineErrToHttpException(result.error);
  }

  c.set("keypair", result.value);
  await next();
});
