import { createAuth } from "thirdweb/auth";
import type { Permission } from "../../../db/types.js";
import {
  engineErrToHttpException,
  type AuthErr,
  type DbErr,
} from "../../../lib/errors.js";
import { err, ok, type Result, ResultAsync } from "neverthrow";
import { getAddress, type JWTPayload } from "thirdweb/utils";
import { createMiddleware } from "hono/factory";
import { extractJwt, mapJwtError } from "./shared.js";
import { checkPermissions } from "../../../lib/permissions.js";

const THIRDWEB_DASHBOARD_ISSUER = "0x016757dDf2Ab6a998a4729A80a091308d9059E17";

export type AuthResult = Result<
  { address: string; permissions: Permission },
  AuthErr | DbErr
>;

function verifyJwt(jwt: string): ResultAsync<JWTPayload, AuthErr> {
  const prodAuth = createAuth({
    domain: "thirdweb.com",
    // @ts-expect-error We only want to verify recovered signer
    adminAccount: { address: THIRDWEB_DASHBOARD_ISSUER },
  });

  const previewAuth = createAuth({
    domain: "thirdweb-preview.com",
    // @ts-expect-error We only want to verify recovered signer
    adminAccount: { address: THIRDWEB_DASHBOARD_ISSUER },
  });

  return ResultAsync.fromPromise(prodAuth.verifyJWT({ jwt }), mapJwtError)
    .orElse(() =>
      ResultAsync.fromPromise(previewAuth.verifyJWT({ jwt }), mapJwtError),
    )
    .andThen((result) =>
      result.valid ? ok(result.parsedJWT) : err(mapJwtError(result.error)),
    );
}

export const dashboardAuth = createMiddleware(async (c, next) => {
  const auth = await extractJwt(c.req.header("authorization"))
    .asyncAndThen(verifyJwt)
    .andThen((payload) =>
      checkPermissions({
        address: getAddress(payload.sub),
        allowedPermissions: ["ADMIN", "OWNER"],
      }),
    );

  if (auth.isErr()) {
    throw engineErrToHttpException(auth.error);
  }

  c.set("user", auth.value);
  await next();
});
