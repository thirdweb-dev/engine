import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import {
  contractParamSchema,
  standardResponseSchema,
} from "../../../schemas/sharedApiSchemas";

const responseSchema = Type.Object({
  result: Type.Object({
    contracts: Type.Array(
      Type.Object({
        chain: Type.String(),
        contractAddress: Type.String(),
      }),
    ),
    status: Type.String(),
  }),
});

responseSchema.example = {
  result: {
    contracts: [
      {
        chain: "ethereum",
        contractAddress: "0x....",
      },
    ],
    status: "success",
  },
};

export async function getAllContracts(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof contractParamSchema>;
    Reply: Static<typeof responseSchema>;
  }>({
    method: "GET",
    url: "/contract/indexer/getAllContracts",
    schema: {
      summary: "Get all indexed contracts",
      description: "Get all indexed contracts",
      tags: ["Contract", "Index"],
      operationId: "read",
      params: contractParamSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      // query all contracts

      reply.status(StatusCodes.OK).send({
        result: {
          contracts: [],
          status: "success",
        },
      });
    },
  });
}
