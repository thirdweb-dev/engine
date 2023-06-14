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
  result: [{}],
};

export async function getABI(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
  }>({
    method: "GET",
    url: "/contract/:chain_name_or_id/:contract_address/metadata/abi",
    schema: {
      description: "Get the ABI of the contract",
      tags: ["Contract-Metadata"],
      operationId: "abi",
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

      let returnData = contract.abi;

      reply.status(StatusCodes.OK).send({
        result: returnData,
      });
    },
  });
}
