import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { resolveContractAbi } from "thirdweb/contract";
import { getContractV5 } from "../../../../utils/cache/getContractV5";
import { AbiSchemaV5 } from "../../../schemas/contract";
import {
  contractParamSchema,
  standardResponseSchema,
} from "../../../schemas/sharedApiSchemas";
import { getChainIdFromChain } from "../../../utils/chain";
const requestSchema = contractParamSchema;

// OUTPUT
const responseSchema = Type.Object({
  result: Type.Array(AbiSchemaV5),
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
      const contract = await getContractV5({
        chainId,
        contractAddress,
      });
      const abi = await resolveContractAbi(contract);
      reply.status(StatusCodes.OK).send({
        result: abi,
      });
    },
  });
}
