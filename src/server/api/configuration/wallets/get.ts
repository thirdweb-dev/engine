import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getConfiguration } from "../../../../db/configuration/getConfiguration";
import { WalletType } from "../../../../schema/wallet";

export const ReplySchema = Type.Object({
  result: Type.Union([
    Type.Object({
      type: Type.Literal(WalletType.local),
    }),
    Type.Object({
      type: Type.Literal(WalletType.awsKms),
      awsAccessKeyId: Type.String(),
      awsRegion: Type.String(),
      // Omit awsSecretAccessKey
    }),
    Type.Object({
      type: Type.Literal(WalletType.gcpKms),
      gcpApplicationProjectId: Type.String(),
      gcpKmsLocationId: Type.String(),
      gcpKmsKeyRingId: Type.String(),
      gcpApplicationCredentialEmail: Type.String(),
      // Omit gcpApplicationCredentialPrivateKey
    }),
  ]),
});

export async function getWalletsConfiguration(fastify: FastifyInstance) {
  fastify.route<{
    Reply: Static<typeof ReplySchema>;
  }>({
    method: "GET",
    url: "/configuration/wallets",
    schema: {
      summary: "Get wallets configuration",
      description: "Get the engine configuration for wallets",
      tags: ["Configuration"],
      operationId: "getWalletsConfiguration",
      response: {
        [StatusCodes.OK]: ReplySchema,
      },
    },
    handler: async (req, res) => {
      const config = await getConfiguration();
      res.status(200).send({
        result: config.walletConfiguration,
      });
    },
  });
}
