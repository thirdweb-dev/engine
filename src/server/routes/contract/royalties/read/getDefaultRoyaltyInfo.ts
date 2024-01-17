import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getContract } from "../../../../../utils/cache/getContract";
import { RoyaltySchema } from "../../../../schemas/contract";
import {
  contractParamSchema,
  standardResponseSchema,
} from "../../../../schemas/sharedApiSchemas";
import { getChainIdFromChain } from "../../../../utils/chain";

const requestSchema = contractParamSchema;

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

export async function getDefaultRoyaltyInfo(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
  }>({
    method: "GET",
    url: "/contract/:chain/:contractAddress/royalties/get-default-royalty-info",
    schema: {
      summary: "Get royalty details",
      description:
        "Gets the royalty recipient and BPS (basis points) of the smart contract.",
      tags: ["Contract-Royalties"],
      operationId: "getDefaultRoyaltyInfo",
      params: requestSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, contractAddress } = request.params;

      const chainId = await getChainIdFromChain(chain);
      const contract = await getContract({
        chainId,
        contractAddress,
      });

      const returnData = await contract.royalties.getDefaultRoyaltyInfo();

      reply.status(StatusCodes.OK).send({
        result: returnData,
      });
    },
  });
}
