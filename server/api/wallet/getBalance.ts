import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import {
  currencyValueSchema,
  standardResponseSchema,
} from "../../helpers/sharedApiSchemas";
import { walletParamSchema } from "../../schemas/wallet";
import { getChainIdFromChain } from "../../utilities/chain";
import { getSdk } from "../../utils/cache/getSdk";

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
      const chainId = getChainIdFromChain(network);
      const sdk = await getSdk({ chainId });

      let balanceData = await sdk.getBalance(wallet_address);

      reply.status(StatusCodes.OK).send({
        result: {
          walletAddress: wallet_address,
          ...balanceData,
          value: balanceData.value.toString(),
        },
      });
    },
  });
}
