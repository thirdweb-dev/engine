import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { WalletType } from "../../../../schema/wallet";
import { getConfig } from "../../../../utils/cache/getConfig";
import { standardResponseSchema } from "../../../schemas/sharedApiSchemas";

export const responseBodySchema = Type.Object({
  result: Type.Object({
    type: Type.Enum(WalletType),

    awsAccessKeyId: Type.String().Optional(),
    awsRegion: Type.String().Optional(),

    // Omit awsSecretAccessKey
    gcpApplicationProjectId: Type.String().Optional(),
    gcpKmsLocationId: Type.String().Optional(),
    gcpKmsKeyRingId: Type.String().Optional(),
    gcpApplicationCredentialEmail: Type.String().Optional(),
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
    handler: async (_req, res) => {
      const config = await getConfig();

      const { legacyWalletType_removeInNextBreakingChange, aws, gcp } =
        config.walletConfiguration;

      res.status(StatusCodes.OK).send({
        result: {
          type: legacyWalletType_removeInNextBreakingChange,
          awsAccessKeyId: aws?.awsAccessKeyId ?? null,
          awsRegion: aws?.defaultAwsRegion ?? null,
          gcpApplicationProjectId: gcp?.defaultGcpApplicationProjectId ?? null,
          gcpKmsLocationId: gcp?.defaultGcpKmsLocationId ?? null,
          gcpKmsKeyRingId: gcp?.defaultGcpKmsKeyRingId ?? null,
          gcpApplicationCredentialEmail:
            gcp?.gcpApplicationCredentialEmail ?? null,
        },
      });
    },
  });
}
