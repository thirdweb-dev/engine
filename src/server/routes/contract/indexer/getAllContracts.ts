import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getAllIndexedContracts } from "../../../../db/indexedContracts/getIndexedContract";
import { standardResponseSchema } from "../../../schemas/sharedApiSchemas";

const responseSchema = Type.Object({
  result: Type.Object({
    contracts: Type.Array(
      Type.Object({
        chainId: Type.Number(),
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

export async function getAllContractsRoute(fastify: FastifyInstance) {
  fastify.route<{
    Reply: Static<typeof responseSchema>;
  }>({
    method: "GET",
    url: "/contract/indexer/getAll",
    schema: {
      summary: "Get all indexed contracts",
      description: "Get all indexed contracts",
      tags: ["Contract", "Index"],
      operationId: "read",
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const allIndexedContracts = await getAllIndexedContracts();

      const contracts = allIndexedContracts.map((val) => ({
        chainId: val.chainId,
        contractAddress: val.contractAddress,
      }));

      reply.status(StatusCodes.OK).send({
        result: {
          contracts,
          status: "success",
        },
      });
    },
  });
}
