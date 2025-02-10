import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getContract } from "../../../../shared/utils/cache/get-contract.js";
import { abiSchema } from "../../../schemas/contract/index.js";
import {
  contractParamSchema,
  standardResponseSchema,
} from "../../../schemas/shared-api-schemas.js";
import { getChainIdFromChain } from "../../../utils/chain.js";

const requestSchema = contractParamSchema;

// OUTPUT
const responseSchema = Type.Object({
  result: Type.Array(abiSchema),
});

responseSchema.example = {
  result: [
    {
      type: "function",
      name: "transferFrom",
      inputs: [
        {
          type: "address",
          name: "from",
        },
        {
          type: "address",
          name: "to",
        },
        {
          type: "uint256",
          name: "tokenId",
        },
      ],
    },
    {
      type: "event",
      name: "Transfer",
      inputs: [
        {
          type: "address",
          name: "from",
        },
        {
          type: "address",
          name: "to",
        },
        {
          type: "uint256",
          name: "tokenId",
        },
      ],
    },
  ],
};

export async function getABI(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
  }>({
    method: "GET",
    url: "/contract/:chain/:contractAddress/metadata/abi",
    schema: {
      summary: "Get ABI",
      description: "Get the ABI of a contract.",
      tags: ["Contract-Metadata"],
      operationId: "getAbi",
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

      const returnData = contract.abi;

      reply.status(StatusCodes.OK).send({
        result: returnData,
      });
    },
  });
}
