import { type Static, Type } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getAllContractSubscriptions } from "../../../../shared/db/contract-subscriptions/get-contract-subscriptions";
import {
  contractSubscriptionSchema,
  toContractSubscriptionSchema,
} from "../../../schemas/contract-subscription";
import { standardResponseSchema } from "../../../schemas/shared-api-schemas";

const responseSchema = Type.Object({
  result: Type.Array(contractSubscriptionSchema),
});

responseSchema.example = {
  result: [
    {
      chain: "ethereum",
      contractAddress: "0x....",
      webhook: {
        url: "https://...",
      },
    },
  ],
};

export async function getContractSubscriptions(fastify: FastifyInstance) {
  fastify.route<{
    Reply: Static<typeof responseSchema>;
  }>({
    method: "GET",
    url: "/contract-subscriptions/get-all",
    schema: {
      summary: "Get contract subscriptions",
      description: "Get all contract subscriptions.",
      tags: ["Contract-Subscriptions"],
      operationId: "getContractSubscriptions",
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (_request, reply) => {
      const contractSubscriptions = await getAllContractSubscriptions();

      reply.status(StatusCodes.OK).send({
        result: contractSubscriptions.map(toContractSubscriptionSchema),
      });
    },
  });
}
