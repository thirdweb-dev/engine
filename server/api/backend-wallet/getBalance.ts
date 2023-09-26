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
    url: "/backend-wallet/:chain/:wallet_address/get-balance",
    schema: {
      description: "Get Wallet Balance",
      tags: ["Backend Wallet"],
      operationId: "backendWallet_getBalance",
      params: requestSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, wallet_address } = request.params;
      const chainId = getChainIdFromChain(chain);
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
