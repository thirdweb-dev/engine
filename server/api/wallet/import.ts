import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { env } from "../../../core/env";
import { WalletType } from "../../../src/schema/wallet";
import { standardResponseSchema } from "../../helpers/sharedApiSchemas";
import { importAwsKmsWallet } from "../../utils/wallets/importAwsKmsWallet";
import { importGcpKmsWallet } from "../../utils/wallets/importGcpKmsWallet";
import { importLocalWallet } from "../../utils/wallets/importLocalWallet";

const AliasSchema = Type.Object({
  alias: Type.Optional(
    Type.String({
      description: "The alias of the wallet to import",
    }),
  ),
});

const RequestBodySchema = Type.Union([
  Type.Object({
    awsKmsKeyId: Type.String({
      description: "AWS KMS Key ID",
      examples: ["12345678-1234-1234-1234-123456789012"],
    }),
    awsKmsArn: Type.String({
      description: "AWS KMS Key ARN",
      examples: [
        "arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012",
      ],
    }),
    ...AliasSchema.properties,
  }),
  Type.Object({
    gcpKmsKeyId: Type.String({
      description: "GCP KMS Key ID",
      examples: ["12345678-1234-1234-1234-123456789012"],
    }),
    gcpKmsKeyVersionId: Type.String({
      description: "GCP KMS Key Version ID",
      examples: ["1"],
    }),
    ...AliasSchema.properties,
  }),
  Type.Union([
    Type.Object({
      privateKey: Type.String({
        description: "The private key of the wallet to import",
      }),
      ...AliasSchema.properties,
    }),
    Type.Object({
      mnemonic: Type.String({
        description: "The mnemonic phrase of the wallet to import",
      }),
      ...AliasSchema.properties,
    }),
    Type.Object({
      encryptedJson: Type.String({
        description: "The encrypted JSON of the wallet to import",
      }),
      password: Type.String({
        description: "The password used to encrypt the encrypted JSON",
      }),
      ...AliasSchema.properties,
    }),
  ]),
]);

RequestBodySchema.examples = [
  {
    privateKey:
      "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
    alias: "my-wallet",
  },
  {
    mnemonic:
      "crouch cabbage puppy sunset fever adjust giggle blanket maze loyal wreck dream",
    alias: "my-wallet",
  },
  {
    encryptedJson: "",
    password: "password123",
    alias: "my-wallet",
  },
  {
    awsKmsKeyId: "12345678-1234-1234-1234-123456789012",
    awsKmsArn:
      "arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012",
    alias: "my-wallet",
  },
  {
    gcpKmsKeyId: "12345678-1234-1234-1234-123456789012",
    gcpKmsKeyVersionId: "1",
    alias: "my-wallet",
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

export const importWallet = async (fastify: FastifyInstance) => {
  fastify.route<{
    Reply: Static<typeof ResponseSchema>;
    Body: Static<typeof RequestBodySchema>;
  }>({
    method: "POST",
    url: "/wallet/import",
    schema: {
      description: "Import a wallet that has already been created",
      tags: ["Wallet"],
      operationId: "wallet_import",
      body: RequestBodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: ResponseSchema,
      },
    },
    handler: async (req, res) => {
      let walletAddress: string;
      switch (env.WALLET_CONFIGURATION.type) {
        case WalletType.local:
          // TODO: This is why where zod would be great
          const { privateKey, mnemonic, encryptedJson, password, alias } =
            req.body as any;

          if (privateKey) {
            walletAddress = await importLocalWallet(
              {
                method: "privateKey",
                privateKey,
              },
              alias,
            );
          } else if (mnemonic) {
            walletAddress = await importLocalWallet(
              {
                method: "mnemonic",
                mnemonic,
              },
              alias,
            );
          } else if (encryptedJson && password) {
            walletAddress = await importLocalWallet(
              {
                method: "encryptedJson",
                encryptedJson,
                password,
              },
              alias,
            );
          } else {
            throw new Error(
              `Please provide either 'privateKey', 'mnemonic', or 'encryptedJson' & 'password' to import a wallet.`,
            );
          }
          break;
        case WalletType.awsKms:
          const { awsKmsArn, awsKmsKeyId } = req.body as any;
          if (!(awsKmsArn && awsKmsKeyId)) {
            throw new Error(
              `Please provide 'awsKmsArn' and 'awsKmsKeyId' to import a wallet.`,
            );
          }

          walletAddress = await importAwsKmsWallet({
            awsKmsArn,
            awsKmsKeyId,
            alias,
          });
          break;
        case WalletType.gcpKms:
          const { gcpKmsKeyId, gcpKmsKeyVersionId } = req.body as any;
          if (!(gcpKmsKeyId && gcpKmsKeyVersionId)) {
            throw new Error(
              `Please provide 'gcpKmsKeyId' and 'gcpKmsKeyVersionId' to import a wallet.`,
            );
          }

          walletAddress = await importGcpKmsWallet({
            gcpKmsKeyId,
            gcpKmsKeyVersionId,
            alias,
          });
          break;
      }

      res.status(StatusCodes.OK).send({
        result: {
          walletAddress,
          status: "success",
        },
      });
    },
  });
};
