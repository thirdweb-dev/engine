import { type Static, Type } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { updateConfiguration } from "../../../../shared/db/configuration/update-configuration";
import { getConfig } from "../../../../shared/utils/cache/get-config";
import { standardResponseSchema } from "../../../schemas/shared-api-schemas";
import { responseBodySchema } from "./get";
import { createCustomError } from "../../../middleware/error";
import { encrypt } from "../../../../shared/utils/crypto";

export const requestBodySchema = Type.Partial(
  Type.Object({
    authDomain: Type.String(),
    mtlsCertificate: Type.String({
      description: "Engine certificate used for outbound mTLS requests.",
    }),
    mtlsPrivateKey: Type.String({
      description: "Engine private key used for outbound mTLS requests.",
    }),
  }),
);

export async function updateAuthConfiguration(fastify: FastifyInstance) {
  fastify.route<{
    Reply: Static<typeof responseBodySchema>;
    Body: Static<typeof requestBodySchema>;
  }>({
    method: "POST",
    url: "/configuration/auth",
    schema: {
      summary: "Update auth configuration",
      description: "Update auth configuration",
      tags: ["Configuration"],
      operationId: "updateAuthConfiguration",
      body: requestBodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseBodySchema,
      },
    },
    handler: async (req, res) => {
      const { authDomain, mtlsCertificate, mtlsPrivateKey } = req.body;

      if (mtlsCertificate) {
        if (
          !(
            mtlsCertificate.startsWith("-----BEGIN CERTIFICATE-----\n") &&
            mtlsCertificate.endsWith("\n-----END CERTIFICATE-----")
          )
        ) {
          throw createCustomError(
            "Invalid mtlsCertificate.",
            StatusCodes.BAD_REQUEST,
            "INVALID_MTLS_CERTIFICATE",
          );
        }
      }
      if (mtlsPrivateKey) {
        if (
          !(
            mtlsPrivateKey.startsWith("-----BEGIN PRIVATE KEY-----\n") &&
            mtlsPrivateKey.endsWith("\n-----END PRIVATE KEY-----")
          )
        ) {
          throw createCustomError(
            "Invalid mtlsPrivateKey.",
            StatusCodes.BAD_REQUEST,
            "INVALID_MTLS_PRIVATE_KEY",
          );
        }
      }

      await updateConfiguration({
        authDomain,
        mtlsCertificateEncrypted: mtlsCertificate
          ? encrypt(mtlsCertificate)
          : undefined,
        mtlsPrivateKeyEncrypted: mtlsPrivateKey
          ? encrypt(mtlsPrivateKey)
          : undefined,
      });

      const config = await getConfig(false);

      res.status(StatusCodes.OK).send({
        result: {
          authDomain: config.authDomain,
          mtlsCertificate: config.mtlsCertificate,
        },
      });
    },
  });
}
