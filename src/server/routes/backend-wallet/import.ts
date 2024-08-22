import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { WalletType } from "../../../schema/wallet";
import { getConfig } from "../../../utils/cache/getConfig";
import { createCustomError } from "../../middleware/error";
import { standardResponseSchema } from "../../schemas/sharedApiSchemas";
import { importAwsKmsWallet } from "../../utils/wallets/importAwsKmsWallet";
import { importGcpKmsWallet } from "../../utils/wallets/importGcpKmsWallet";
import { importLocalWallet } from "../../utils/wallets/importLocalWallet";

const RequestBodySchema = Type.Union([
  Type.Object({
    awsKmsKeyId: Type.String({
      description: "AWS KMS key ID",
      examples: ["12345678-1234-1234-1234-123456789012"],
    }),
    awsKmsArn: Type.String({
      description: "AWS KMS key ARN",
      examples: [
        "arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012",
      ],
    }),
  }),
  Type.Object({
    gcpKmsKeyId: Type.String({
      description: "GCP KMS key ID",
      examples: ["12345678-1234-1234-1234-123456789012"],
    }),
    gcpKmsKeyVersionId: Type.String({
      description: "GCP KMS key version ID",
      examples: ["1"],
    }),
  }),
  Type.Union([
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
    awsKmsKeyId: "12345678-1234-1234-1234-123456789012",
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
    walletAddress: Type.String(),
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
      let walletAddress: string;
      const config = await getConfig();
      switch (config.walletConfiguration.type) {
        case WalletType.local:
          // TODO: This is why where zod would be great
          const { privateKey, mnemonic, encryptedJson, password } =
            request.body as any;

          if (privateKey) {
            walletAddress = await importLocalWallet({
              method: "privateKey",
              privateKey,
            });
          } else if (mnemonic) {
            walletAddress = await importLocalWallet({
              method: "mnemonic",
              mnemonic,
            });
          } else if (encryptedJson && password) {
            walletAddress = await importLocalWallet({
              method: "encryptedJson",
              encryptedJson,
              password,
            });
          } else {
            throw createCustomError(
              `Please provide either 'privateKey', 'mnemonic', or 'encryptedJson' & 'password' to import a wallet.`,
              StatusCodes.BAD_REQUEST,
              "MISSING_PARAMETERS",
            );
          }
          break;
        case WalletType.awsKms:
          const { awsKmsArn, awsKmsKeyId } = request.body as any;
          if (!(awsKmsArn && awsKmsKeyId)) {
            throw createCustomError(
              `Please provide 'awsKmsArn' and 'awsKmsKeyId' to import a wallet.`,
              StatusCodes.BAD_REQUEST,
              "MISSING_PARAMETERS",
            );
          }

          walletAddress = await importAwsKmsWallet({
            awsKmsArn,
            awsKmsKeyId,
          });
          break;
        case WalletType.gcpKms:
          const { gcpKmsKeyId, gcpKmsKeyVersionId } = request.body as any;
          if (!(gcpKmsKeyId && gcpKmsKeyVersionId)) {
            throw createCustomError(
              `Please provide 'gcpKmsKeyId' and 'gcpKmsKeyVersionId' to import a wallet.`,
              StatusCodes.BAD_REQUEST,
              "MISSING_PARAMETERS",
            );
          }

          walletAddress = await importGcpKmsWallet({
            gcpKmsKeyId,
            gcpKmsKeyVersionId,
          });
          break;
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
