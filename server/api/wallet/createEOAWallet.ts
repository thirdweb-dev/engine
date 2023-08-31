import { Static, Type } from "@sinclair/typebox";
import { AwsKmsWallet } from "@thirdweb-dev/wallets/evm/wallets/aws-kms";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import {
  addWalletDataWithSupportChainsNonceToDB,
  connectWithDatabase,
} from "../../../core";
import { getWalletBackUpType } from "../../../core/helpers";
import { standardResponseSchema } from "../../helpers/sharedApiSchemas";
import { createAWSKMSWallet } from "../../helpers/wallets";

// INPUTS
const AWS_REGION = process.env.AWS_REGION;
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;

// OUTPUT
const responseSchema = Type.Object({
  result: Type.Object({
    walletAddress: Type.String(),
    status: Type.String(),
  }),
});

responseSchema.example = {
  result: {},
};

export async function createEOAWallet(fastify: FastifyInstance) {
  fastify.route<{
    Reply: Static<typeof responseSchema>;
  }>({
    method: "POST",
    url: "/wallet/create",
    schema: {
      description: "Create EOA wallet as Admin Wallet for web3api",
      tags: ["Wallet"],
      operationId: "wallet_create",
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const walletType = getWalletBackUpType();
      if (walletType === "ppk") {
        throw new Error(
          "Cannot use Private Key to create EOA wallet. Please use AWS KMS or GCP KMS. See <link> for more details.",
        );
      }

      let wallet: AwsKmsWallet | undefined;
      let awsKmsArn = undefined;
      let awsKmsKeyId = undefined;
      let walletAddress = "";
      request.log.info(`walletType: ${walletType}`);

      if (walletType === "aws_kms") {
        const { keyId, arn } = await createAWSKMSWallet(
          fastify,
          "Web3 API KMS Admin Wallet",
        );

        awsKmsArn = arn;
        awsKmsKeyId = keyId;

        const wallet = new AwsKmsWallet({
          region: AWS_REGION!,
          accessKeyId: AWS_ACCESS_KEY_ID!,
          secretAccessKey: AWS_SECRET_ACCESS_KEY!,
          keyId,
        });

        walletAddress = await wallet.getAddress();
      } else if (walletType === "gcp") {
        // ToDo GCP KMS
      }

      const dbInstance = await connectWithDatabase();
      await addWalletDataWithSupportChainsNonceToDB(
        fastify,
        dbInstance,
        false,
        walletAddress,
        { walletType, awsKmsArn, awsKmsKeyId },
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
