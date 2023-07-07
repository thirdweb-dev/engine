import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { Type, Static } from "@sinclair/typebox";
import { getSDK } from "../../../core";
import {
  currencyValueSchema,
  standardResponseSchema,
} from "../../helpers/sharedApiSchemas";
import { walletParamSchema } from "../../schemas/wallet";

// INPUTS
const requestSchema = walletParamSchema;

// OUTPUT
const responseSchema = Type.Object({
  result: Type.Object({
    walletAddress: Type.String(),
    ...currencyValueSchema.properties,
  }),
});

responseSchema.example = {
  result: {
    walletAddress: "0x...",
    name: "ERC20",
    symbol: "",
    decimals: "18",
    value: "0",
    displayValue: "0.0",
  },
};

export async function getBalance(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
  }>({
    method: "GET",
    url: "/wallet/:network/getBalance",
    schema: {
      description: "Get Admin Wallet Balance",
      tags: ["Admin Wallet"],
      operationId: "adminWalletBalance",
      params: requestSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { network } = request.params;

      const sdk = await getSDK(network);

      let balanceData = await sdk.wallet.balance();
      let address = await sdk.wallet.getAddress();

      reply.status(StatusCodes.OK).send({
        result: {
          walletAddress: address,
          ...balanceData,
          value: balanceData.value.toString(),
        },
      });
    },
  });
}
