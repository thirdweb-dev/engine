import { type Static, Type } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getSdk } from "../../../utils/cache/getSdk";
import { AddressSchema } from "../../schemas/address";
import {
  currencyValueSchema,
  standardResponseSchema,
} from "../../schemas/sharedApiSchemas";
import { walletWithAddressParamSchema } from "../../schemas/wallet";
import { getChainIdFromChain } from "../../utils/chain";

const responseSchema = Type.Object({
  result: Type.Object({
    walletAddress: AddressSchema,
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
    Params: Static<typeof walletWithAddressParamSchema>;
    Reply: Static<typeof responseSchema>;
  }>({
    method: "GET",
    url: "/backend-wallet/:chain/:walletAddress/get-balance",
    schema: {
      summary: "Get balance",
      description: "Get the native balance for a backend wallet.",
      tags: ["Backend Wallet"],
      operationId: "getBalance",
      params: walletWithAddressParamSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, walletAddress } = request.params;
      const chainId = await getChainIdFromChain(chain);
      const sdk = await getSdk({ chainId });

      const balanceData = await sdk.getBalance(walletAddress);

      reply.status(StatusCodes.OK).send({
        result: {
          walletAddress,
          ...balanceData,
          value: balanceData.value.toString(),
        },
      });
    },
  });
}
