import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { resolveContractAbi } from "thirdweb/contract";
import { Abi } from "thirdweb/utils";
import { getContractV5 } from "../../../../utils/cache/getContractv5";
import { AbiSchema } from "../../../schemas/contract/abi";
import {
  contractParamSchema,
  standardResponseSchema,
} from "../../../schemas/sharedApiSchemas";
import { getChainIdFromChain } from "../../../utils/chain";

const requestSchema = contractParamSchema;

// OUTPUT
const responseSchema = Type.Object({
  result: AbiSchema,
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

      const abi: Abi = await resolveContractAbi(contract);

      reply.status(StatusCodes.OK).send({
        result: abi,
      });
    },
  });
}
