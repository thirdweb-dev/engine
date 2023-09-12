import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
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
    url: "/wallet/:network/:wallet_address/getBalance",
    schema: {
      description: "Get Wallet Balance",
      tags: ["Wallet"],
      operationId: "wallet_getBalance",
      params: requestSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { network, wallet_address } = request.params;

      const sdk = await getSDK(network, wallet_address);

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
