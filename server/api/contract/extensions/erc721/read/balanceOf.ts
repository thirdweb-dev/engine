import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";

import { Static, Type } from "@sinclair/typebox";
import {
  erc721ContractParamSchema,
  standardResponseSchema,
} from "../../../../../helpers/sharedApiSchemas";
import { getChainIdFromChain } from "../../../../../utilities/chain";
import { getContract } from "../../../../../utils/cache/getContract";

// INPUTS
const requestSchema = erc721ContractParamSchema;
const querystringSchema = Type.Object({
  wallet_address: Type.String({
    description: "Address of the wallet to check NFT balance",
    examples: ["0x1946267d81Fb8aDeeEa28e6B98bcD446c8248473"],
  }),
});

// OUTPUT
const responseSchema = Type.Object({
  result: Type.Optional(Type.String()),
});

responseSchema.example = {
  result: "1",
};

// LOGIC
export async function erc721BalanceOf(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
    Querystring: Static<typeof querystringSchema>;
  }>({
    method: "GET",
    url: "/contract/:chain/:contract_address/erc721/balance-of",
    schema: {
      summary: "Get token balance",
      description:
        "Get the balance of a specific wallet address for this ERC-721 contract.",
      tags: ["ERC721"],
      operationId: "erc721_balanceOf",
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
      const returnData = await contract.erc721.balanceOf(wallet_address);
      reply.status(StatusCodes.OK).send({
        result: returnData.toString(),
      });
    },
  });
}
