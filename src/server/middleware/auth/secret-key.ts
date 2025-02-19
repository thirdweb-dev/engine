import { createMiddleware } from "hono/factory";
import { extractJwt } from "./shared";
import { engineErrToHttpException } from "../../../lib/errors";
import { env } from "../../../lib/env";

export const secretKeyAuth = createMiddleware(async (c, next) => {
  const secretKey = extractJwt(c.req.header("authorization"));

  if (secretKey.isErr()) {
    throw engineErrToHttpException(secretKey.error);
  }

  if (secretKey.value === env.THIRDWEB_API_SECRET_KEY) {
    return await next();
  }

  throw engineErrToHttpException({
    kind: "auth",
    code: "invalid_jwt",
    status: 401,
    message: "Invalid secret key",
  } as const);
});
