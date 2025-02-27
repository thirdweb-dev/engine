import { describeRoute } from "hono-openapi";
import { authRoutesFactory } from "./factory";
import { resolver, validator } from "hono-openapi/zod";
import {
  engineErrToHttpException,
  mapDbError,
  zErrorMapper,
} from "../../../lib/errors";
import * as z from "zod";
import { adminAccount } from "../../../lib/admin-account";
import { config } from "../../../lib/config";
import { encodeJWT } from "thirdweb/utils";
import { db } from "../../../db/connection";
import { tokens } from "../../../db/schema";
import { ResultAsync } from "neverthrow";
import { accessTokenDbEntrySchema } from "../../../db/derived-schemas";
import { wrapResponseSchema } from "../../schemas/shared-api-schemas";

export const createAccessTokenRoute = authRoutesFactory.createHandlers(
  describeRoute({
    tags: ["Auth"],
    summary: "Create Access Token",
    description: "Create an access token for a client",
    responses: {
      200: {
        description: "Access token created successfully",
        content: {
          "application/json": {
            schema: resolver(
              wrapResponseSchema(
                accessTokenDbEntrySchema.extend({
                  accessToken: z.string().openapi({
                    description: "The access token created",
                  }),
                })
              )
            ),
          },
        },
      },
    },
  }),
  validator(
    "json",
    z.object({
      label: z.string(),
    }),
    zErrorMapper
  ),
  async (c) => {
    const { label } = c.req.valid("json");

    const user = c.get("user");

    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 365 * 100);

    const id = crypto.randomUUID();
    const jwt = await encodeJWT({
      account: adminAccount,
      payload: {
        iss: adminAccount.address,
        sub: user?.address ?? adminAccount.address,
        aud: config.authDomain,
        nbf: new Date(),
        // Set to expire in 100 years
        exp: expiresAt,
        iat: new Date(),
        ctx: {
          permissions: user?.permissions ?? ["ADMIN"],
        },
        jti: id,
      },
    });

    const dbResult = await ResultAsync.fromPromise(
      db
        .insert(tokens)
        .values({
          id,
          accountAddress: user?.address ?? adminAccount.address,
          isAccessToken: true,
          label: label,
          expiresAt,
          tokenMask: `${jwt.slice(0, 10)}...${jwt.slice(-10)}`,
        })
        .returning(),
      mapDbError
    );

    if (dbResult.isErr()) {
      throw engineErrToHttpException(dbResult.error);
    }

    const createdToken = dbResult.value[0];

    if (!createdToken) {
      throw engineErrToHttpException({
        kind: "database",
        code: "query_failed",
        status: 500,
        message: "Failed to create access token",
      });
    }

    return c.json({ result: { accessToken: jwt, ...createdToken } });
  }
);
