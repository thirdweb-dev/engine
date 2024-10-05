import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { resolveContractAbi } from "thirdweb/contract";
import type { Abi, AbiEvent } from "thirdweb/utils";
import { getContractV5 } from "../../../../utils/cache/getContractv5";
import { AbiEventSchema } from "../../../schemas/contract/abi";
import {
  contractParamSchema,
  standardResponseSchema,
} from "../../../schemas/sharedApiSchemas";
import { getChainIdFromChain } from "../../../utils/chain";

const requestSchema = contractParamSchema;

// OUTPUT
const responseSchema = Type.Object({
  result: Type.Array(AbiEventSchema),
});

responseSchema.example = {
  result: [
    {
      name: "Approval",
      inputs: [
        {
          type: "address",
          name: "owner",
        },
        {
          type: "address",
          name: "approved",
        },
        {
          type: "uint256",
          name: "tokenId",
        },
      ],
      outputs: [],
    },
    {
      name: "ApprovalForAll",
      inputs: [
        {
          type: "address",
          name: "owner",
        },
        {
          type: "address",
          name: "operator",
        },
        {
          type: "bool",
          name: "approved",
        },
      ],
      outputs: [],
    },
  ],
};

export async function extractEvents(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
  }>({
    method: "GET",
    url: "/contract/:chain/:contractAddress/metadata/events",
    schema: {
      summary: "Get events",
      description: "Get details of all events implemented by a contract.",
      tags: ["Contract-Metadata"],
      operationId: "getContractEvents",
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
      const events = abi.filter(
        (abiItem): abiItem is AbiEvent => abiItem.type === "event",
      );

      reply.status(StatusCodes.OK).send({
        result: events,
      });
    },
  });
}
