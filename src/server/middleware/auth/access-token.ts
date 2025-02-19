import { createAuth } from "thirdweb/auth";
import type { JWTPayload } from "thirdweb/utils";
import { engineErrToHttpException, type AuthErr } from "../../../lib/errors";
import { err, ok, ResultAsync } from "neverthrow";
import { extractJwt, mapJwtError } from "./shared";
import { createMiddleware } from "hono/factory";
import { getAccessToken } from "../../../lib/access-tokens";
import { checkPermissions } from "../../../lib/permissions";
import { config } from "../../../lib/config";
import { adminAccount } from "../../../lib/admin-account";

function verifyJwt(jwt: string): ResultAsync<JWTPayload, AuthErr> {
  const auth = createAuth({
    domain: config.authDomain,
    adminAccount,
  });

  return ResultAsync.fromPromise(auth.verifyJWT({ jwt }), mapJwtError).andThen(
    (result) =>
      result.valid ? ok(result.parsedJWT) : err(mapJwtError(result.error)),
  );
}

export const accessTokenAuth = createMiddleware(async (c, next) => {
  const auth = await extractJwt(c.req.header("authorization"))
    .asyncAndThen(verifyJwt)
    .andThen((payload) => getAccessToken(payload.jti))
    .andThen(({ accountAddress }) =>
      checkPermissions({
        address: accountAddress,
        allowedPermissions: ["ADMIN", "OWNER"],
      }),
    );

  if (auth.isErr()) {
    throw engineErrToHttpException(auth.error);
  }

  c.set("user", auth.value);
  await next();
});
