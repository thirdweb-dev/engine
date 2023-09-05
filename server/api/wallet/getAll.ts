import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getSDK } from "../../../core";
import { getAllWallets } from "../../helpers";
import {
  currencyValueSchema,
  standardResponseSchema,
} from "../../helpers/sharedApiSchemas";
import { walletParamSchema, walletTableSchema } from "../../schemas/wallet";

// INPUTS
const requestQuerySchema = Type.Omit(walletParamSchema, ["wallet_address"]);

// OUTPUT
const responseSchema = Type.Object({
  result: Type.Array(
    Type.Object({
      ...walletTableSchema.properties,
      balance: Type.Object({ ...currencyValueSchema.properties }),
    }),
  ),
});

responseSchema.example = {
  result: [
    {
      walletAddress: "0x40cea365cd9af45a44988d1ad12867627b803ebf",
      chainId: "80001",
      walletType: "aws_kms",
      blockchainNonce: 0,
      lastSyncedTimestamp: "2023-08-31T00:36:39.977Z",
      lastUsedNonce: -1,
      awsKmsKeyId: "<aws_kms_key_id>",
      awsKmsArn: "<aws_kms_key_arn>",
      balance: {
        name: "MATIC",
        symbol: "MATIC",
        decimals: 18,
        value: "0",
        displayValue: "0.0",
      },
    },
  ],
};

export async function getAll(fastify: FastifyInstance) {
  fastify.route<{
    Querystring: Static<typeof requestQuerySchema>;
    Reply: Static<typeof responseSchema>;
  }>({
    method: "GET",
    url: "/wallet/getAll",
    schema: {
      description: "Get all created EOA wallet",
      tags: ["Wallet"],
      operationId: "wallet_getAll",
      querystring: requestQuerySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      let { network } = request.query;
      network = network.toLowerCase();

      const wallets = await getAllWallets(network);
      const promise = wallets.map(async (wallet) => {
        const sdk = await getSDK(network, {
          walletAddress: wallet.walletAddress,
          walletType: wallet.walletType,
          awsKmsKeyId: wallet.awsKmsKeyId,
          gcpKmsKeyId: wallet.gcpKmsKeyId,
        });
        const balance = await sdk.wallet.balance();
        return {
          ...wallet,
          balance: {
            ...balance,
            value: balance.value.toString(),
          },
        };
      });

      const allWalletsData = await Promise.all(promise);

      reply.status(StatusCodes.OK).send({
        result: allWalletsData,
      });
    },
  });
}
