import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getContract } from "../../../../../../shared/utils/cache/get-contract.js";
import {
  contractParamSchema,
  standardResponseSchema,
} from "../../../../../schemas/shared-api-schemas.js";
import { getChainIdFromChain } from "../../../../../utils/chain.js";

// INPUTS
const requestSchema = contractParamSchema;
const querystringSchema = Type.Object({
  ownerWallet: Type.String({
    description: "Address of the wallet who owns the NFT",
    examples: ["0x3EcDBF3B911d0e9052b64850693888b008e18373"],
  }),
  operator: Type.String({
    description: "Address of the operator to check approval on",
    examples: ["0x1946267d81Fb8aDeeEa28e6B98bcD446c8248473"],
  }),
});

// OUTPUT
const responseSchema = Type.Object({
  result: Type.Optional(Type.Boolean()),
});

responseSchema.example = {
  result: false,
};

// LOGIC
export async function erc721IsApproved(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
    Querystring: Static<typeof querystringSchema>;
  }>({
    method: "GET",
    url: "/contract/:chain/:contractAddress/erc721/is-approved",
    schema: {
      summary: "Check if approved transfers",
      description:
        "Check if the specific wallet has approved transfers from a specific operator wallet.",
      tags: ["ERC721"],
      operationId: "erc721-isApproved",
      params: requestSchema,
      querystring: querystringSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, contractAddress } = request.params;
      const { ownerWallet, operator } = request.query;
      const chainId = await getChainIdFromChain(chain);
      const contract = await getContract({
        chainId,
        contractAddress,
      });
      const returnData = await contract.erc721.isApproved(
        ownerWallet,
        operator,
      );

      reply.status(StatusCodes.OK).send({
        result: returnData,
      });
    },
  });
}
