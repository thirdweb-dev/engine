import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getAllContractSubscriptions } from "../../../../db/contractSubscriptions/getContractSubscriptions";
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

export async function getContractSubscriptions(fastify: FastifyInstance) {
  fastify.route<{
    Reply: Static<typeof responseSchema>;
  }>({
    method: "GET",
    url: "/contract/subscriptions/get-all",
    schema: {
      summary: "Get all contract subscriptions",
      description: "Get all contract subscriptions.",
      tags: ["Contract-Subscriptions"],
      operationId: "getContractSubscriptions",
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const contractSubscriptions = await getAllContractSubscriptions();

      const contracts = contractSubscriptions.map((val) => ({
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
