import { Static, Type } from "@sinclair/typebox";
import { Abi } from "@thirdweb-dev/sdk";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { resolveContractAbi } from "thirdweb/contract";
import { getContractV5 } from "../../../../utils/cache/getContractV5";
import { AbiFunctionSchemaV5 } from "../../../schemas/contract";
import {
  contractParamSchema,
  standardResponseSchema,
} from "../../../schemas/sharedApiSchemas";
import { getChainIdFromChain } from "../../../utils/chain";

const requestSchema = contractParamSchema;

// OUTPUT
const responseSchema = Type.Object({
  result: Type.Array(AbiFunctionSchemaV5),
});

responseSchema.example = {
  result: [
    {
      name: "balanceOf",
      inputs: [
        {
          type: "address",
          name: "owner",
        },
      ],
      outputs: [
        {
          type: "uint256",
          name: "",
        },
      ],
      stateMutability: "view",
    },
    {
      name: "burn",
      inputs: [
        {
          type: "uint256",
          name: "tokenId",
        },
      ],
      outputs: [],
      stateMutability: "nonpayable",
    },
  ],
};

export async function extractFunctions(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
  }>({
    method: "GET",
    url: "/contract/:chain/:contractAddress/metadata/functions",
    schema: {
      summary: "Get functions",
      description: "Get details of all functions implemented by the contract.",
      tags: ["Contract-Metadata"],
      operationId: "getFunctions",
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
      const abi: Abi = await resolveContractAbi(contract);

      const returnData = abi.filter(
        (item) => item.type === "function",
      ) as Static<typeof AbiFunctionSchemaV5>[];

      reply.status(StatusCodes.OK).send({
        result: returnData,
      });
    },
  });
}
