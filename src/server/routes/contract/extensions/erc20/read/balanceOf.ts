import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";

import { Static, Type } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { getBalance } from "thirdweb/extensions/erc20";
import { getContractV5 } from "../../../../../../utils/cache/getContractV5";
import {
  erc20ContractParamSchema,
  standardResponseSchema,
} from "../../../../../schemas/sharedApiSchemas";
import { getChainIdFromChain } from "../../../../../utils/chain";

// INPUTS
const requestSchema = erc20ContractParamSchema;
const querystringSchema = Type.Object({
  walletAddress: Type.String({
    description: "Address of the wallet to check token balance",
    examples: ["0x1946267d81Fb8aDeeEa28e6B98bcD446c8248473"],
  }),
});

// OUTPUT
const responseSchema = Type.Object({
  result: Type.String({
    description: "The balance of the wallet for the ERC-20 contract",
  }),
});

responseSchema.example = [
  {
    result: "7799999999615999974",
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
    url: "/contract/:chain/:contractAddress/erc20/balance-of",
    schema: {
      summary: "Get token balance",
      description:
        "Get the balance of a specific wallet address for this ERC-20 contract.",
      tags: ["ERC20"],
      operationId: "balanceOf",
      params: requestSchema,
      querystring: querystringSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, contractAddress } = request.params;
      const { walletAddress } = request.query;
      const chainId = await getChainIdFromChain(chain);
      const contract = await getContractV5({
        chainId,
        contractAddress,
      });
      const returnData = await getBalance({
        contract,
        address: walletAddress,
      });
      reply.status(StatusCodes.OK).send({
        ...(Value.Convert(responseSchema, { result: returnData }) as Static<
          typeof responseSchema
        >),
      });
    },
  });
}
