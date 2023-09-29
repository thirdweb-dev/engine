import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";

import { Static, Type } from "@sinclair/typebox";
import {
  erc20ContractParamSchema,
  standardResponseSchema,
} from "../../../../../helpers/sharedApiSchemas";
import { erc20MetadataSchema } from "../../../../../schemas/erc20";
import { getChainIdFromChain } from "../../../../../utilities/chain";
import { getContract } from "../../../../../utils/cache/getContract";

// INPUTS
const requestSchema = erc20ContractParamSchema;
const querystringSchema = Type.Object({
  wallet_address: Type.String({
    description: "Address of the wallet to check token balance",
    examples: ["0x1946267d81Fb8aDeeEa28e6B98bcD446c8248473"],
  }),
});

// OUTPUT
const responseSchema = Type.Object({
  result: erc20MetadataSchema,
});

responseSchema.example = [
  {
    result: {
      name: "ERC20",
      symbol: "",
      decimals: "18",
      value: "7799999999615999974",
      displayValue: "7.799999999615999974",
    },
  },
];

// LOGIC
export async function erc20BalanceOf(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
    Querystring: Static<typeof querystringSchema>;
  }>({
    method: "GET",
    url: "/contract/:chain/:contract_address/erc20/balance-of",
    schema: {
      summary: "Get token balance",
      description:
        "Get the balance of a specific wallet address for this ERC-20 contract.",
      tags: ["ERC20"],
      operationId: "erc20_balanceOf",
      params: requestSchema,
      querystring: querystringSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, contract_address } = request.params;
      const { wallet_address } = request.query;
      const chainId = getChainIdFromChain(chain);
      const contract = await getContract({
        chainId,
        contractAddress: contract_address,
      });
      const returnData = await contract.erc20.balanceOf(wallet_address);
      reply.status(StatusCodes.OK).send({
        result: {
          name: returnData.name,
          symbol: returnData.symbol,
          decimals: returnData.decimals.toString(),
          displayValue: returnData.displayValue,
          value: returnData.value.toString(),
        },
      });
    },
  });
}
