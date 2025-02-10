import { Type, type Static } from "@sinclair/typebox";
import { buildJWT } from "@thirdweb-dev/auth";
import { LocalWallet } from "@thirdweb-dev/wallets";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { updateConfiguration } from "../../../../shared/db/configuration/update-configuration.js";
import { createToken } from "../../../../shared/db/tokens/create-token.js";
import { accessTokenCache } from "../../../../shared/utils/cache/access-token.js";
import { getConfig } from "../../../../shared/utils/cache/get-config.js";
import { env } from "../../../../shared/utils/env.js";
import { standardResponseSchema } from "../../../schemas/shared-api-schemas.js";
import { AccessTokenSchema } from "./get-all.js";

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
      const { label } = req.body;

      const config = await getConfig();
      const wallet = new LocalWallet();

      // TODO: Remove this with next breaking change
      try {
        // First try to load the wallet using the encryption password
        await wallet.import({
          encryptedJson: config.authWalletEncryptedJson,
          password: env.ENCRYPTION_PASSWORD,
        });
      } catch {
        // If that fails, try the thirdweb api secret key for backwards compatibility
        await wallet.import({
          encryptedJson: config.authWalletEncryptedJson,
          password: env.THIRDWEB_API_SECRET_KEY,
        });

        // If that works, save the wallet using the encryption password for the future
        const authWalletEncryptedJson = await wallet.export({
          strategy: "encryptedJson",
          password: env.ENCRYPTION_PASSWORD,
        });

        await updateConfiguration({
          authWalletEncryptedJson,
        });
      }

      const jwt = await buildJWT({
        wallet,
        payload: {
          iss: await wallet.getAddress(),
          sub: req.user.address,
          aud: config.authDomain,
          nbf: new Date(),
          // Set to expire in 100 years
          exp: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365 * 100),
          iat: new Date(),
          ctx: req.user.session,
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
