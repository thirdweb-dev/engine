import { Static, Type } from "@sinclair/typebox";
import { LocalWallet } from "@thirdweb-dev/wallets";
import { AwsKmsWallet } from "@thirdweb-dev/wallets/evm/wallets/aws-kms";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { LocalFileStorage, connectToDatabase, env } from "../../../core";
import { createWalletDetails } from "../../../src/db/wallets/createWalletDetails";
import { standardResponseSchema } from "../../helpers/sharedApiSchemas";
import {
  createAWSKMSWallet,
  createGCPKMSWallet,
  getGCPKeyWalletAddress,
} from "../../helpers/wallets";
import { WalletConfigType } from "../../schemas/wallet";

// INPUTS

const requestBodySchema = Type.Object({
  walletType: Type.String({
    description: "Wallet Type",
    examples: ["aws-kms", "gcp-kms", "local"],
  }),
});

requestBodySchema.examples = [
  {
    walletType: "aws-kms",
  },
  {
    walletType: "gcp-kms",
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

export async function createEOAWallet(fastify: FastifyInstance) {
  fastify.route<{
    Reply: Static<typeof responseSchema>;
    Body: Static<typeof requestBodySchema>;
  }>({
    method: "POST",
    url: "/wallet/create",
    schema: {
      description: "Create backend EOA wallet",
      tags: ["Wallet"],
      operationId: "wallet_create",
      body: requestBodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      let walletAddress = "";

      const { walletType } = request.body;
      request.log.info(`walletType: ${walletType}`);

      const dbInstance = await connectToDatabase();
      if (walletType === WalletConfigType.aws_kms) {
        if (
          !env.AWS_REGION ||
          !env.AWS_ACCESS_KEY_ID ||
          !env.AWS_SECRET_ACCESS_KEY
        ) {
          throw new Error(
            "AWS_REGION or AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY is not defined. Please check .env file",
          );
        }

        const { keyId, arn } = await createAWSKMSWallet(
          fastify,
          "Web3 API AWS KMS Backend Wallet",
        );

        const awsKmsArn = arn;
        const awsKmsKeyId = keyId;

        const wallet = new AwsKmsWallet({
          region: env.AWS_REGION!,
          accessKeyId: env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: env.AWS_SECRET_ACCESS_KEY!,
          keyId,
        });

        walletAddress = await wallet.getAddress();
        await createWalletDetails({
          address: walletAddress,
          type: "aws-kms",
          awsKmsArn,
          awsKmsKeyId,
        });
      } else if (walletType === WalletConfigType.gcp_kms) {
        const cryptoKeyId = `ec-web3api-${new Date().getTime()}`;
        const key = await createGCPKMSWallet(cryptoKeyId);
        const gcpKmsKeyId = cryptoKeyId;
        const gcpKmsKeyRingId = env.GOOGLE_KMS_KEY_RING_ID;
        const gcpKmsLocationId = env.GOOGLE_KMS_LOCATION_ID;
        const { ["walletAddress"]: gcpCreatedWallet, keyVersionId } =
          await getGCPKeyWalletAddress(gcpKmsKeyId);
        const gcpKmsKeyVersionId = keyVersionId;
        const gcpKmsResourcePath = key.name! + "/cryptoKeysVersion/1";
        walletAddress = gcpCreatedWallet;
        await createWalletDetails({
          address: walletAddress,
          type: "gcp-kms",
          gcpKmsKeyId,
          gcpKmsKeyRingId,
          gcpKmsLocationId,
          gcpKmsKeyVersionId,
          gcpKmsResourcePath,
        });
      } else if (walletType === WalletConfigType.local) {
        const wallet = new LocalWallet();
        walletAddress = await wallet.generate();
        wallet.save({
          strategy: "encryptedJson",
          password: env.THIRDWEB_API_SECRET_KEY,
          storage: new LocalFileStorage(walletAddress),
        });
        await createWalletDetails({
          address: walletAddress,
          type: "local",
        });
      }

      await dbInstance.destroy();
      if (!walletAddress) {
        throw new Error("Could not create wallet");
      }
      reply.status(StatusCodes.OK).send({
        result: {
          walletAddress,
          status: "success",
        },
      });
    },
  });
}
