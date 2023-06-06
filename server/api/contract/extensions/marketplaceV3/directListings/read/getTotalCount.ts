import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getContractInstace } from "../../../../../../../core";
import { Static, Type } from "@sinclair/typebox";
import {
  contractParamSchema,
  standardResponseSchema,
} from "../../../../../../helpers/sharedApiSchemas";

// INPUT
const requestSchema = contractParamSchema;

// OUPUT
const responseSchema = Type.Object({
  result: Type.String(),
});

responseSchema.examples = [
  {
    result: "1",
  },
];

// LOGIC
export async function dlGetTotalCount(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
  }>({
    method: "GET",
    url: "/marketplace/v3/:chain_name_or_id/:contract_address/directListing/getTotalCount",
    schema: {
      description:
        "Get the total number of direct listings on the marketplace.",
      tags: ["MarketplaceV3-DirectListings"],
      operationId: "mktpv3_getTotalCount",
      params: requestSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain_name_or_id, contract_address } = request.params;
      const contract = await getContractInstace(
        chain_name_or_id,
        contract_address,
      );
      const result = await contract.directListings.getTotalCount();

      reply.status(StatusCodes.OK).send({
        result: result.toString(),
      });
    },
  });
}
