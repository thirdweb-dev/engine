import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getContractInstance } from "../../../../core";
import {
  contractEventSchema,
  contractParamSchema,
  standardResponseSchema,
} from "../../../helpers/sharedApiSchemas";
import { Static, Type } from "@sinclair/typebox";

const requestSchema = contractParamSchema;

// OUTPUT
const responseSchema = Type.Object({
  result: Type.Any(),
});

responseSchema.example = {
  result: [],
};

export async function extractFunctions(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
  }>({
    method: "GET",
    url: "/contract/:chain_name_or_id/:contract_address/metadata/functions",
    schema: {
      description:
        "Get details of all functions implemented by the contract, and the data types of their parameters",
      tags: ["Contract-Metadata"],
      operationId: "extractFunctions",
      params: requestSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain_name_or_id, contract_address } = request.params;

      const contract = await getContractInstance(
        chain_name_or_id,
        contract_address,
      );

      let returnData = await contract.publishedMetadata.extractFunctions();

      reply.status(StatusCodes.OK).send({
        result: returnData,
      });
    },
  });
}
