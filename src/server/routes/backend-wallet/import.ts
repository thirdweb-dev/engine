import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getConfig } from "../../../shared/utils/cache/get-config";
import { createCustomError } from "../../middleware/error";
import { AddressSchema } from "../../schemas/address";
import { standardResponseSchema } from "../../schemas/sharedApiSchemas";
import { getGcpKmsResourcePath } from "../../utils/wallets/gcpKmsResourcePath";
import { importAwsKmsWallet } from "../../utils/wallets/importAwsKmsWallet";
import { importGcpKmsWallet } from "../../utils/wallets/importGcpKmsWallet";
import { importLocalWallet } from "../../utils/wallets/importLocalWallet";

const RequestBodySchema = Type.Intersect([
  Type.Object({
    label: Type.Optional(
      Type.String({
        description: "Optional label for the imported wallet",
      }),
    ),
  }),
  Type.Union([
    Type.Object({
      awsKmsArn: Type.String({
        description: "AWS KMS key ARN",
        examples: [
          "arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012",
        ],
      }),
      credentials: Type.Optional(
        Type.Object(
          {
            awsAccessKeyId: Type.String({ description: "AWS Access Key ID" }),
            awsSecretAccessKey: Type.String({
              description: "AWS Secret Access Key",
            }),
          },
          {
            description:
              "Optional AWS credentials to use for importing the wallet, if not provided, the default AWS credentials will be used (if available).",
          },
        ),
      ),
    }),
    // TODO: with next breaking change, only require GCP KMS resource path
    Type.Object({
      gcpKmsKeyId: Type.String({
        description: "GCP KMS key ID",
        examples: ["12345678-1234-1234-1234-123456789012"],
      }),
      gcpKmsKeyVersionId: Type.String({
        description: "GCP KMS key version ID",
        examples: ["1"],
      }),
      credentials: Type.Optional(
        Type.Object(
          {
            email: Type.String({ description: "GCP service account email" }),
            privateKey: Type.String({
              description: "GCP service account private key",
            }),
          },
          {
            description:
              "Optional GCP credentials to use for importing the wallet, if not provided, the default GCP credentials will be used (if available).",
          },
        ),
      ),
    }),
    Type.Object({
      privateKey: Type.String({
        description: "The private key of the wallet to import",
      }),
    }),
    Type.Object({
      mnemonic: Type.String({
        description: "The mnemonic phrase of the wallet to import",
      }),
    }),
    Type.Object({
      encryptedJson: Type.String({
        description: "The encrypted JSON of the wallet to import",
      }),
      password: Type.String({
        description: "The password used to encrypt the encrypted JSON",
      }),
    }),
  ]),
]);

RequestBodySchema.examples = [
  {
    privateKey:
      "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  },
  {
    mnemonic:
      "crouch cabbage puppy sunset fever adjust giggle blanket maze loyal wreck dream",
  },
  {
    encryptedJson: "",
    password: "password123",
  },
  {
    awsKmsArn:
      "arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012",
  },
  {
    gcpKmsKeyId: "12345678-1234-1234-1234-123456789012",
    gcpKmsKeyVersionId: "1",
  },
];

const ResponseSchema = Type.Object({
  result: Type.Object({
    walletAddress: AddressSchema,
    status: Type.String(),
  }),
});

ResponseSchema.example = {
  result: {
    walletAddress: "0x....",
    status: "success",
  },
};

export const importBackendWallet = async (fastify: FastifyInstance) => {
  fastify.route<{
    Reply: Static<typeof ResponseSchema>;
    Body: Static<typeof RequestBodySchema>;
  }>({
    method: "POST",
    url: "/backend-wallet/import",
    schema: {
      summary: "Import backend wallet",
      description: "Import an existing wallet as a backend wallet.",
      tags: ["Backend Wallet"],
      operationId: "import",
      body: RequestBodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: ResponseSchema,
      },
    },
    handler: async (request, reply) => {
      let walletAddress: string | undefined;
      const body = request.body;
      const config = await getConfig();

      // AWS KMS
      if ("awsKmsArn" in body) {
        const { awsKmsArn, label, credentials } = body;

        const secretAccessKey =
          credentials?.awsSecretAccessKey ??
          config.walletConfiguration.aws?.awsSecretAccessKey;
        const accessKeyId =
          credentials?.awsAccessKeyId ??
          config.walletConfiguration.aws?.awsAccessKeyId;

        if (!(accessKeyId && secretAccessKey)) {
          throw createCustomError(
            `Please provide 'awsAccessKeyId' and 'awsSecretAccessKey' to import a wallet. Can be provided as configuration or as credential with the request.`,
            StatusCodes.BAD_REQUEST,
            "MISSING_PARAMETERS",
          );
        }

        walletAddress = await importAwsKmsWallet({
          awsKmsArn,
          crendentials: {
            accessKeyId,
            secretAccessKey,
          },
          label,
        });
      }

      if ("gcpKmsKeyId" in body && !walletAddress) {
        const { gcpKmsKeyId, gcpKmsKeyVersionId, credentials, label } = body;

        const email =
          credentials?.email ??
          config.walletConfiguration.gcp?.gcpApplicationCredentialEmail;
        const privateKey =
          credentials?.privateKey ??
          config.walletConfiguration.gcp?.gcpApplicationCredentialPrivateKey;

        if (!(email && privateKey)) {
          throw createCustomError(
            `Please provide 'email' and 'privateKey' to import a wallet. Can be provided as configuration or as credential with the request.`,
            StatusCodes.BAD_REQUEST,
            "MISSING_PARAMETERS",
          );
        }

        // TODO: with next breaking change, only require GCP KMS resource path
        // import endoint does not currently have resource path in the request body
        // so we rely on the global configuration for these values
        if (
          !(
            config.walletConfiguration.gcp?.defaultGcpKmsKeyRingId &&
            config.walletConfiguration.gcp?.defaultGcpApplicationProjectId &&
            config.walletConfiguration.gcp?.defaultGcpKmsLocationId
          )
        ) {
          throw createCustomError(
            "GCP KMS location ID, project ID, and key ring ID are required configuration for this wallet type",
            StatusCodes.BAD_REQUEST,
            "MISSING_PARAMETERS",
          );
        }

        const gcpKmsResourcePath = getGcpKmsResourcePath({
          locationId: config.walletConfiguration.gcp.defaultGcpKmsLocationId,
          keyRingId: config.walletConfiguration.gcp.defaultGcpKmsKeyRingId,
          cryptoKeyId: gcpKmsKeyId,
          projectId:
            config.walletConfiguration.gcp.defaultGcpApplicationProjectId,
          versionId: gcpKmsKeyVersionId,
        });

        const walletAddress = await importGcpKmsWallet({
          gcpKmsResourcePath,
          credentials: {
            email,
            privateKey,
          },
          label,
        });

        return reply.status(StatusCodes.OK).send({
          result: {
            walletAddress,
            status: "success",
          },
        });
      }

      if ("privateKey" in body && !walletAddress) {
        walletAddress = await importLocalWallet({
          method: "privateKey",
          privateKey: body.privateKey,
          label: body.label,
        });
      }

      if ("mnemonic" in body && !walletAddress) {
        walletAddress = await importLocalWallet({
          method: "mnemonic",
          mnemonic: body.mnemonic,
          label: body.label,
        });
      }

      if ("encryptedJson" in body && !walletAddress) {
        walletAddress = await importLocalWallet({
          method: "encryptedJson",
          encryptedJson: body.encryptedJson,
          password: body.password,
          label: body.label,
        });
      }

      if (!walletAddress) {
        throw createCustomError(
          "Invalid request body, please provide a valid wallet import method",
          StatusCodes.BAD_REQUEST,
          "INVALID_REQUEST",
        );
      }

      reply.status(StatusCodes.OK).send({
        result: {
          walletAddress,
          status: "success",
        },
      });
    },
  });
};
