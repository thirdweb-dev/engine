import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import {
  contractParamSchema,
  standardResponseSchema,
} from "../../../helpers/sharedApiSchemas";
import { abiSchema } from "../../../schemas/contract";
import { getChainIdFromChain } from "../../../utilities/chain";
import { getContract } from "../../../utils/cache/getContract";

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
    url: "/contract/:chain/:contract_address/metadata/abi",
    schema: {
      summary: "Get ABI",
      description: "Get the ABI of a contract.",
      tags: ["Contract-Metadata"],
      operationId: "abi",
      params: requestSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, contract_address } = request.params;

      const chainId = getChainIdFromChain(chain);
      const contract = await getContract({
        chainId,
        contractAddress: contract_address,
      });

      let returnData = contract.abi;

      reply.status(StatusCodes.OK).send({
        result: returnData,
      });
    },
  });
}
