import { Static, Type } from "@sinclair/typebox";
import { LocalWallet } from "@thirdweb-dev/wallets";
import { AwsKmsWallet } from "@thirdweb-dev/wallets/evm/wallets/aws-kms";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { LocalFileStorage, connectToDatabase, env } from "../../../core";
import { createWalletDetails } from "../../../src/db/wallets/createWalletDetails";
import { standardResponseSchema } from "../../helpers/sharedApiSchemas";
import { getAWSKMSWallet, getGCPKeyWalletAddress } from "../../helpers/wallets";
import { WalletConfigType } from "../../schemas/wallet";

// INPUTS

const requestBodySchema = Type.Object({
  walletType: Type.String({
    description: "Wallet Type",
    examples: ["aws_kms", "gcp_kms", "ppk"],
  }),
  privateKey: Type.Optional(
    Type.String({
      description: "Private key to import",
    }),
  ),
  awsKMS: Type.Optional(
    Type.Object({
      keyId: Type.String({
        description: "AWS KMS Key ID",
        examples: ["12345678-1234-1234-1234-123456789012"],
      }),
      arn: Type.String({
        description: "AWS KMS Key ARN",
        examples: [
          "arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012",
        ],
      }),
    }),
  ),
  gcpKMS: Type.Optional(
    Type.Object({
      keyId: Type.String({
        description: "GCP KMS Key ID",
        examples: ["12345678-1234-1234-1234-123456789012"],
      }),
      versionId: Type.String({
        description: "GCP KMS Key Version ID",
        examples: ["1"],
      }),
    }),
  ),
});

// OUTPUT
const responseSchema = Type.Object({
  result: Type.Object({
    walletAddress: Type.String(),
    status: Type.String(),
  }),
});

responseSchema.example = {
  result: {
    walletAddress: "0x....",
    status: "success",
  },
};

export async function addWallet(fastify: FastifyInstance) {
  fastify.route<{
    Reply: Static<typeof responseSchema>;
    Body: Static<typeof requestBodySchema>;
  }>({
    method: "POST",
    url: "/wallet/import",
    schema: {
      description: "Import already created EOA wallet as backend",
      tags: ["Wallet"],
      operationId: "wallet_import",
      body: requestBodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      let wallet: AwsKmsWallet | undefined;
      let walletAddress = "";

      const { walletType, privateKey, awsKMS, gcpKMS } = request.body;

      request.log.info(`walletType: ${walletType}`);

      if (walletType === WalletConfigType.aws_kms) {
        if (!awsKMS?.keyId || !awsKMS?.arn) {
          throw new Error(
            "AWS KMS Key ID or ARN is not defined. Please check request body",
          );
        }

        const { keyId, arn } = awsKMS;
        const wallet = await getAWSKMSWallet(keyId);
        const awsKmsArn = arn;
        const awsKmsKeyId = keyId;
        walletAddress = await wallet.getAddress();

        await createWalletDetails({
          address: walletAddress,
          type: walletType,
          awsKmsArn,
          awsKmsKeyId,
        });
      } else if (walletType === WalletConfigType.gcp_kms) {
        if (!gcpKMS?.keyId || !gcpKMS?.versionId) {
          throw new Error(
            "GCP KMS Key ID & Key Version Id is not defined. Please check request body",
          );
        }

        const { keyId: cryptoKeyId, versionId } = gcpKMS;
        const gcpKmsKeyId = cryptoKeyId;
        const { ["walletAddress"]: gcpCreatedWallet } =
          await getGCPKeyWalletAddress(gcpKmsKeyId);
        const gcpKmsKeyRingId = env.GOOGLE_KMS_KEY_RING_ID;
        const gcpKmsLocationId = env.GOOGLE_KMS_LOCATION_ID;
        const gcpKmsKeyVersionId = versionId;
        const gcpKmsResourcePath = `projects/${env.GOOGLE_APPLICATION_PROJECT_ID}/locations/${env.GOOGLE_KMS_LOCATION_ID}/keyRings/${env.GOOGLE_KMS_KEY_RING_ID}/cryptoKeys/${cryptoKeyId}/cryptoKeysVersion/${gcpKmsKeyVersionId}`;
        walletAddress = gcpCreatedWallet;

        await createWalletDetails({
          address: walletAddress,
          type: walletType,
          gcpKmsKeyId,
          gcpKmsKeyRingId,
          gcpKmsLocationId,
          gcpKmsKeyVersionId,
          gcpKmsResourcePath,
        });
      } else if (WalletConfigType.ppk) {
        if (!privateKey) {
          throw new Error("privateKey is not defined!");
        }

        const wallet = new LocalWallet();
        walletAddress = await wallet.import({
          privateKey,
          encryption: false,
        });

        wallet.save({
          strategy: "encryptedJson",
          password: env.THIRDWEB_API_SECRET_KEY,
          storage: new LocalFileStorage(walletAddress),
        });

        await createWalletDetails({
          address: walletAddress,
          type: "local",
        });
      } else {
        throw new Error(`Wallet Type ${walletType} is not supported`);
      }

      const dbInstance = await connectToDatabase();

      await dbInstance.destroy();
      reply.status(StatusCodes.OK).send({
        result: {
          walletAddress,
          status: "success",
        },
      });
    },
  });
}
