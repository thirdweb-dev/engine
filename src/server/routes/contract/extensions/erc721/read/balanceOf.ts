import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";

import { Static, Type } from "@sinclair/typebox";
import { getContract } from "../../../../../../utils/cache/getContract";
import {
  erc721ContractParamSchema,
  standardResponseSchema,
} from "../../../../../schemas/sharedApiSchemas";
import { getChainIdFromChain } from "../../../../../utils/chain";

// INPUTS
const requestSchema = erc721ContractParamSchema;
const querystringSchema = Type.Object({
  walletAddress: Type.String({
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
    url: "/contract/:chain/:contractAddress/erc721/balance-of",
    schema: {
      summary: "Get token balance",
      description:
        "Get the balance of a specific wallet address for this ERC-721 contract.",
      tags: ["ERC721"],
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
      const contract = await getContract({
        chainId,
        contractAddress,
      });
      const returnData = await contract.call("balanceOf", [walletAddress]);
      reply.status(StatusCodes.OK).send({
        result: returnData.toString(),
      });
    },
  });
}
