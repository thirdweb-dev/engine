import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { WalletType } from "../../../../schema/wallet";
import { getConfig } from "../../../../utils/cache/getConfig";
import { standardResponseSchema } from "../../../schemas/sharedApiSchemas";

export const responseBodySchema = Type.Object({
  result: Type.Object({
    awsAccessKeyId: Type.Optional(Type.String()),
    awsRegion: Type.Optional(Type.String()),
    gcpApplicationProjectId: Type.Optional(Type.String()),
    gcpKmsLocationId: Type.Optional(Type.String()),
    gcpKmsKeyRingId: Type.Optional(Type.String()),
    gcpApplicationCredentialEmail: Type.Optional(Type.String()),
    // Omit gcpApplicationCredentialPrivateKey
  }),
});

export async function getWalletsConfiguration(fastify: FastifyInstance) {
  fastify.route<{
    Reply: Static<typeof responseBodySchema>;
  }>({
    method: "GET",
    url: "/configuration/wallets",
    schema: {
      summary: "Get wallets configuration",
      description: "Get wallets configuration",
      tags: ["Configuration"],
      operationId: "getWalletsConfiguration",
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseBodySchema,
      },
    },
    handler: async (req, res) => {
      const config = await getConfig();
      res.status(200).send({
        result: config.walletConfiguration,
      });
    },
  });
}
