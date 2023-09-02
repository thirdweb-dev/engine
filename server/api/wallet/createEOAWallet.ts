import { Static, Type } from "@sinclair/typebox";
import { AwsKmsWallet } from "@thirdweb-dev/wallets/evm/wallets/aws-kms";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import {
  addWalletDataWithSupportChainsNonceToDB,
  connectWithDatabase,
  env,
} from "../../../core";
import { standardResponseSchema } from "../../helpers/sharedApiSchemas";
import { createAWSKMSWallet } from "../../helpers/wallets";
import { WalletConfigType } from "../../schemas/wallet";

// INPUTS

const requestBodySchema = Type.Object({
  walletType: Type.String({
    description: "Wallet Type",
    examples: ["aws_kms", "gcp_kms"],
  }),
});

requestBodySchema.examples = [
  {
    walletType: "aws_kms",
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
  result: {},
};

export async function createEOAWallet(fastify: FastifyInstance) {
  fastify.route<{
    Reply: Static<typeof responseSchema>;
    Body: Static<typeof requestBodySchema>;
  }>({
    method: "POST",
    url: "/wallet/create",
    schema: {
      description: "Create EOA wallet as Admin Wallet for web3api",
      tags: ["Wallet"],
      operationId: "wallet_create",
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
      let walletAddress = "";

      const { walletType } = request.body;

      request.log.info(`walletType: ${walletType}`);

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
          "Web3 API KMS Admin Wallet",
        );

        awsKmsArn = arn;
        awsKmsKeyId = keyId;

        const wallet = new AwsKmsWallet({
          region: env.AWS_REGION!,
          accessKeyId: env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: env.AWS_SECRET_ACCESS_KEY!,
          keyId,
        });

        walletAddress = await wallet.getAddress();
      } else if (walletType === WalletConfigType.gcp_kms) {
        // ToDo
        // const key = await createGCPKMSWallet();
        // const name = "test-web3-api";
        // // console.log("GCP", name);
        // const publicKey = await getGCPPublicKey(name!);
        // walletAddress = publicKey;
        // request.log.info(`GCP walletAddress: ${walletAddress}`);
        throw new Error("GCP KMS Wallet is not supported yet");
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
