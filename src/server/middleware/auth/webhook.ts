import type { Context } from "hono";
import { createMiddleware } from "hono/factory";
import { okAsync, ResultAsync } from "neverthrow";
import {
  engineErrToHttpException,
  mapDbError,
  type AuthErr,
  type DbErr,
  type WebhookErr,
} from "../../../lib/errors.js";
import { db } from "../../../db/connection.js";
import { sendWebhookRequest } from "../../../lib/webhooks/send-webhook.js";
import { getCookie } from "hono/cookie";

function checkWebhookAuth(
  c: Context,
): ResultAsync<boolean, WebhookErr | DbErr> {
  return ResultAsync.fromPromise(
    db.query.webhooks.findMany({
      where: (webhooks, { or, eq }) => or(eq(webhooks.eventType, "AUTH")),
    }),
    mapDbError,
  ).andThen((webhooks) => {
    if (webhooks.length === 0) {
      return okAsync(false);
    }

    const webhookRequests = webhooks.map((webhook) =>
      sendWebhookRequest(webhook, {
        url: c.req.url,
        method: c.req.method,
        headers: c.req.header(),
        params: c.req.param(),
        query: c.req.query(),
        cookies: getCookie(c),
        body: c.req.json(),
      }),
    );

    return ResultAsync.combine(webhookRequests).map((responses) =>
      responses.every((r) => r.ok),
    );
  });
}

export const webhookAuth = createMiddleware(async (c, next) => {
  const result = await checkWebhookAuth(c);
  if (result.isErr()) {
    throw result.error;
  }

  if (!result.value) {
    throw engineErrToHttpException({
      code: "webhook_auth_failed",
      kind: "auth",
      status: 401,
      message: "Webhook authentication failed",
    } as AuthErr);
  }

  await next();
});
