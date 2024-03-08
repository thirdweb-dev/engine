import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { resolveContractAbi } from "thirdweb/contract";
import { Abi } from "viem";
import { getContractV5 } from "../../../../utils/cache/getContractV5";
import { AbiEventSchemaV5 } from "../../../schemas/contract";
import {
  contractParamSchema,
  standardResponseSchema,
} from "../../../schemas/sharedApiSchemas";
import { getChainIdFromChain } from "../../../utils/chain";

const requestSchema = contractParamSchema;

// OUTPUT
const responseSchema = Type.Object({
  result: Type.Array(AbiEventSchemaV5),
});

responseSchema.example = {
  result: [
    {
      type: "event",
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "address",
          name: "account",
          type: "address",
        },
        {
          indexed: true,
          internalType: "address",
          name: "operator",
          type: "address",
        },
        {
          indexed: false,
          internalType: "bool",
          name: "approved",
          type: "bool",
        },
      ],
      name: "ApprovalForAll",
    },
    {
      type: "event",
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "address",
          name: "newRoyaltyRecipient",
          type: "address",
        },
        {
          indexed: false,
          internalType: "uint256",
          name: "newRoyaltyBps",
          type: "uint256",
        },
      ],
      name: "DefaultRoyalty",
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
      operationId: "getEvents",
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

      const returnData = abi.filter((item) => item.type === "event") as Static<
        typeof AbiEventSchemaV5
      >[];

      reply.status(StatusCodes.OK).send({
        result: returnData,
      });
    },
  });
}
