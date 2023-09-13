import { Static, Type } from "@sinclair/typebox";
import { AwsKmsWallet } from "@thirdweb-dev/wallets/evm/wallets/aws-kms";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import {
  addWalletDataWithSupportChainsNonceToDB,
  connectToDatabase,
  env,
} from "../../../core";
import { standardResponseSchema } from "../../helpers/sharedApiSchemas";
import { getAWSKMSWallet, getGCPKeyWalletAddress } from "../../helpers/wallets";
import { WalletConfigType } from "../../schemas/wallet";

// INPUTS

const requestBodySchema = Type.Object({
  walletType: Type.String({
    description: "Wallet Type",
    examples: ["aws_kms", "gcp_kms", "local"],
  }),
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

requestBodySchema.examples = [
  {
    walletTye: "aws_kms",
    awsKMS: {
      keyId: "12345678-1234-1234-1234-123456789012",
      arn: "arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012",
    },
  },
  {
    walletTye: "gcp_kms",
    gcpKMS: {
      keyId: "12345678-1234-1234-1234-123456789012",
      versionId: "1",
    },
  },
];

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
      let awsKmsArn = undefined;
      let awsKmsKeyId = undefined;
      let gcpKmsKeyId = undefined;
      let gcpKmsKeyRingId = undefined;
      let gcpKmsLocationId = undefined;
      let gcpKmsKeyVersionId = undefined;
      let gcpKmsResourcePath = undefined;
      let walletAddress = "";

      const { walletType, awsKMS, gcpKMS } = request.body;

      request.log.info(`walletType: ${walletType}`);

      if (walletType === WalletConfigType.aws_kms) {
        if (!awsKMS?.keyId || !awsKMS?.arn) {
          throw new Error(
            "AWS KMS Key ID or ARN is not defined. Please check request body",
          );
        }

        const { keyId, arn } = awsKMS;
        const wallet = await getAWSKMSWallet(keyId);
        awsKmsArn = arn;
        awsKmsKeyId = keyId;
        walletAddress = await wallet.getAddress();
      } else if (walletType === WalletConfigType.gcp_kms) {
        if (!gcpKMS?.keyId || !gcpKMS?.versionId) {
          throw new Error(
            "GCP KMS Key ID & Key Version Id is not defined. Please check request body",
          );
        }

        const { keyId: cryptoKeyId, versionId } = gcpKMS;
        gcpKmsKeyId = cryptoKeyId;
        const { ["walletAddress"]: gcpCreatedWallet } =
          await getGCPKeyWalletAddress(gcpKmsKeyId);
        gcpKmsKeyRingId = env.GOOGLE_KMS_KEY_RING_ID;
        gcpKmsLocationId = env.GOOGLE_KMS_LOCATION_ID;
        gcpKmsKeyVersionId = versionId;
        gcpKmsResourcePath = `projects/${env.GOOGLE_APPLICATION_PROJECT_ID}/locations/${env.GOOGLE_KMS_LOCATION_ID}/keyRings/${env.GOOGLE_KMS_KEY_RING_ID}/cryptoKeys/${cryptoKeyId}/cryptoKeysVersion/${gcpKmsKeyVersionId}`;
        walletAddress = gcpCreatedWallet;
      } else {
        throw new Error(`Wallet Type ${walletType} is not supported`);
      }

      const dbInstance = await connectToDatabase();
      await addWalletDataWithSupportChainsNonceToDB(
        fastify,
        dbInstance,
        false,
        walletAddress,
        {
          walletType,
          awsKmsArn,
          awsKmsKeyId,
          gcpKmsKeyId,
          gcpKmsKeyRingId,
          gcpKmsLocationId,
          gcpKmsKeyVersionId,
          gcpKmsResourcePath,
        },
      );
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
