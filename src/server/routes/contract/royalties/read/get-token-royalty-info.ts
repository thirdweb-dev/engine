import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getContract } from "../../../../../shared/utils/cache/get-contract";
import { royaltySchema } from "../../../../schemas/contract";
import {
  contractParamSchema,
  standardResponseSchema,
} from "../../../../schemas/shared-api-schemas";
import { getChainIdFromChain } from "../../../../utils/chain";

const requestSchema = Type.Object({
  tokenId: Type.String(),
  ...contractParamSchema.properties,
});
// OUTPUT
const responseSchema = Type.Object({
  result: royaltySchema,
});

responseSchema.examples = [
  {
    result: {
      fee_recipient: "0x1946267d81Fb8aDeeEa28e6B98bcD446c8248473",
      seller_fee_basis_points: 100,
    },
  },
];

export async function getTokenRoyaltyInfo(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
  }>({
    method: "GET",
    url: "/contract/:chain/:contractAddress/royalties/get-token-royalty-info/:tokenId",
    schema: {
      summary: "Get token royalty details",
      description:
        "Gets the royalty recipient and BPS (basis points) of a particular token in the contract.",
      tags: ["Contract-Royalties"],
      operationId: "getTokenRoyaltyInfo",
      params: requestSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, contractAddress, tokenId } = request.params;

      const chainId = await getChainIdFromChain(chain);
      const contract = await getContract({
        chainId,
        contractAddress,
      });

      const returnData = await contract.royalties.getTokenRoyaltyInfo(tokenId);

      reply.status(StatusCodes.OK).send({
        result: returnData,
      });
    },
  });
}
