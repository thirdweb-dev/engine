import { Static, Type } from "@sinclair/typebox";
import { buildJWT } from "@thirdweb-dev/auth";
import { LocalWallet } from "@thirdweb-dev/wallets";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getConfiguration } from "../../../../src/db/configuration/getConfiguration";
import { createToken } from "../../../../src/db/tokens/createToken";
import { env } from "../../../../src/utils/env";
import { AccessTokenSchema } from "./getAll";

const ReplySchema = Type.Object({
  result: Type.Composite([
    AccessTokenSchema,
    Type.Object({
      accessToken: Type.String(),
    }),
  ]),
});

export async function createAccessToken(fastify: FastifyInstance) {
  fastify.route<{
    Reply: Static<typeof ReplySchema>;
  }>({
    method: "POST",
    url: "/auth/access-tokens/create",
    schema: {
      summary: "Create a new access token",
      description: "Create a new access token",
      tags: ["Access Tokens"],
      operationId: "createAccessToken",
      response: {
        [StatusCodes.OK]: ReplySchema,
      },
    },
    handler: async (req, res) => {
      const config = await getConfiguration();
      const wallet = new LocalWallet();
      await wallet.import({
        encryptedJson: config.authWalletEncryptedJson,
        password: env.THIRDWEB_API_SECRET_KEY,
      });

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

      const token = await createToken({ jwt, isAccessToken: true });

      res.status(200).send({
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
