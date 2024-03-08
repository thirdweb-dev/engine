import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";

import { Static, Type } from "@sinclair/typebox";
import { isApprovedForAll } from "thirdweb/extensions/erc721";
import { getContractV5 } from "../../../../../../utils/cache/getContractV5";
import {
  contractParamSchema,
  standardResponseSchema,
} from "../../../../../schemas/sharedApiSchemas";
import { getChainIdFromChain } from "../../../../../utils/chain";

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
  result: Type.Boolean(),
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
      operationId: "isApproved",
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
      const contract = await getContractV5({
        chainId,
        contractAddress,
      });
      const returnData = await isApprovedForAll({
        contract,
        owner: ownerWallet,
        operator,
      });

      reply.status(StatusCodes.OK).send({
        result: returnData,
      });
    },
  });
}
