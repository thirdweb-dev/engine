import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import {
  contractParamSchema,
  standardResponseSchema,
} from "../../../../helpers/sharedApiSchemas";
import { RoyaltySchema } from "../../../../schemas/contract";
import { getChainIdFromChain } from "../../../../utilities/chain";
import { getContract } from "../../../../utils/cache/getContract";

const requestSchema = Type.Object({
  tokenId: Type.String(),
  ...contractParamSchema.properties,
});
// OUTPUT
const responseSchema = Type.Object({
  result: RoyaltySchema,
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
    url: "/contract/:chain/:contract_address/royalties/get-token-royalty-info/:token_id",
    schema: {
      summary: "Get Token Royalty Info",
      description:
        "Gets the royalty recipient and BPS (basis points) of a particular token in the contract.",
      tags: ["Contract-Royalties"],
      operationId: "royalties_getDefaultRoyaltyInfo",
      params: requestSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, contract_address, tokenId } = request.params;

      const chainId = getChainIdFromChain(chain);
      const contract = await getContract({
        chainId,
        contractAddress: contract_address,
      });

      const returnData = await contract.royalties.getTokenRoyaltyInfo(tokenId);

      reply.status(StatusCodes.OK).send({
        result: returnData,
      });
    },
  });
}
