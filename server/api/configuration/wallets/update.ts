import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getConfiguration } from "../../../../src/db/configuration/getConfiguration";
import { updateConfiguration } from "../../../../src/db/configuration/updateConfiguration";
import { WalletType } from "../../../../src/schema/wallet";
import { ReplySchema } from "./get";

const BodySchema = Type.Union([
  Type.Object({
    type: Type.Literal(WalletType.local),
  }),
  Type.Object({
    type: Type.Literal(WalletType.awsKms),
    awsAccessKeyId: Type.String(),
    awsSecretAccessKey: Type.String(),
    awsRegion: Type.String(),
  }),
  Type.Object({
    type: Type.Literal(WalletType.gcpKms),
    gcpApplicationProjectId: Type.String(),
    gcpKmsLocationId: Type.String(),
    gcpKmsKeyRingId: Type.String(),
    gcpApplicationCredentialEmail: Type.String(),
    gcpApplicationCredentialPrivateKey: Type.String(),
  }),
]);

export async function updateWalletsConfiguration(fastify: FastifyInstance) {
  fastify.route<{
    Body: Static<typeof BodySchema>;
    Reply: Static<typeof ReplySchema>;
  }>({
    method: "POST",
    url: "/configuration/wallets",
    schema: {
      summary: "Update wallets configuration",
      description: "Update the engine configuration for wallets",
      tags: ["Configuration"],
      operationId: "updateWalletsConfiguration",
      response: {
        [StatusCodes.OK]: ReplySchema,
      },
    },
    handler: async (req, res) => {
      switch (req.body.type) {
        case WalletType.local:
          await updateConfiguration({
            awsAccessKeyId: null,
            awsSecretAccessKey: null,
            awsRegion: null,
            gcpApplicationProjectId: null,
            gcpKmsLocationId: null,
            gcpKmsKeyRingId: null,
            gcpApplicationCredentialEmail: null,
            gcpApplicationCredentialPrivateKey: null,
          });
          break;
        case WalletType.awsKms:
          if (
            !req.body.awsAccessKeyId ||
            !req.body.awsSecretAccessKey ||
            !req.body.awsRegion
          ) {
            throw new Error("Please specify all AWS KMS configuration.");
          }

          await updateConfiguration({
            awsAccessKeyId: req.body.awsAccessKeyId,
            awsSecretAccessKey: req.body.awsSecretAccessKey,
            awsRegion: req.body.awsRegion,
            gcpApplicationProjectId: null,
            gcpKmsLocationId: null,
            gcpKmsKeyRingId: null,
            gcpApplicationCredentialEmail: null,
            gcpApplicationCredentialPrivateKey: null,
          });
          break;
        case WalletType.gcpKms:
          if (
            !req.body.gcpApplicationProjectId ||
            !req.body.gcpKmsLocationId ||
            !req.body.gcpKmsKeyRingId ||
            !req.body.gcpApplicationCredentialEmail ||
            !req.body.gcpApplicationCredentialPrivateKey
          ) {
            throw new Error("Please specify all GCP KMS configuration.");
          }

          await updateConfiguration({
            awsAccessKeyId: null,
            awsSecretAccessKey: null,
            awsRegion: null,
            gcpApplicationProjectId: req.body.gcpApplicationProjectId,
            gcpKmsLocationId: req.body.gcpKmsLocationId,
            gcpKmsKeyRingId: req.body.gcpKmsKeyRingId,
            gcpApplicationCredentialEmail:
              req.body.gcpApplicationCredentialEmail,
            gcpApplicationCredentialPrivateKey:
              req.body.gcpApplicationCredentialPrivateKey,
          });
          break;
      }

      const config = await getConfiguration();
      res.status(200).send({
        result: config.walletConfiguration,
      });
    },
  });
}
