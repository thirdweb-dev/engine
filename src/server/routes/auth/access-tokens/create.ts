import { Type, type Static } from "@sinclair/typebox";
import { buildJWT } from "@thirdweb-dev/auth";
import { LocalWallet } from "@thirdweb-dev/wallets";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { updateConfiguration } from "../../../../shared/db/configuration/update-configuration";
import { createToken } from "../../../../shared/db/tokens/create-token";
import { accessTokenCache } from "../../../../shared/utils/cache/access-token";
import { getConfig } from "../../../../shared/utils/cache/get-config";
import { env } from "../../../../shared/utils/env";
import { standardResponseSchema } from "../../../schemas/shared-api-schemas";
import { AccessTokenSchema } from "./get-all";
import { assertAuthenticationType } from "../../../utils/auth";

const requestBodySchema = Type.Object({
  label: Type.Optional(Type.String()),
});

const responseBodySchema = Type.Object({
  result: Type.Object({
    ...AccessTokenSchema.properties,
    accessToken: Type.String(),
  }),
});

export async function createAccessToken(fastify: FastifyInstance) {
  fastify.route<{
    Body: Static<typeof requestBodySchema>;
    Reply: Static<typeof responseBodySchema>;
  }>({
    method: "POST",
    url: "/auth/access-tokens/create",
    schema: {
      summary: "Create a new access token",
      description: "Create a new access token",
      tags: ["Access Tokens"],
      operationId: "createAccessToken",
      body: requestBodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseBodySchema,
      },
    },
    handler: async (req, res) => {
      assertAuthenticationType(req, ["dashboard", "secret-key"]);

      const { label } = req.body;
      const config = await getConfig();

      const wallet = new LocalWallet();
      await wallet.import({
        encryptedJson: config.authWalletEncryptedJson,
        password: env.ENCRYPTION_PASSWORD,
      });

      const jwt = await buildJWT({
        wallet,
        payload: {
          iss: await wallet.getAddress(),
          sub: req.authentication.user.address,
          aud: config.authDomain,
          nbf: new Date(),
          // Set to expire in 100 years
          exp: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365 * 100),
          iat: new Date(),
          ctx: req.authentication.user.session,
        },
      });

      const token = await createToken({ jwt, isAccessToken: true, label });

      accessTokenCache.clear();

      res.status(StatusCodes.OK).send({
        result: {
          ...token,
          createdAt: token.createdAt.toISOString(),
          expiresAt: token.expiresAt.toISOString(),
          accessToken: jwt,
        },
      });
    },
  });
}
