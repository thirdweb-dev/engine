import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getContractInstance } from "../../../../core";
import {
  contractParamSchema,
  standardResponseSchema,
} from "../../../helpers/sharedApiSchemas";
import { Static, Type } from "@sinclair/typebox";
import { abiFunctionSchema } from "../../../schemas/contract";

const requestSchema = contractParamSchema;

// OUTPUT
const responseSchema = Type.Object({
  result: Type.Array(abiFunctionSchema),
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
    url: "/contract/:network/:contract_address/metadata/functions",
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
      const { network, contract_address } = request.params;

      const contract = await getContractInstance(network, contract_address);

      let returnData =
        (await contract.publishedMetadata.extractFunctions()) as Static<
          typeof responseSchema
        >["result"];

      reply.status(StatusCodes.OK).send({
        result: returnData,
      });
    },
  });
}
