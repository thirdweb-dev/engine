import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getContractInstance } from "../../../../core";
import {
  contractParamSchema,
  standardResponseSchema,
} from "../../../helpers/sharedApiSchemas";
import { Static, Type } from "@sinclair/typebox";
import { abiSchema } from "../../../schemas/contract";

const requestSchema = contractParamSchema;

// OUTPUT
const responseSchema = Type.Object({
  result: Type.Array(abiSchema),
});

responseSchema.example = {
  result: [
    {
      type: "constructor",
      name: "",
      inputs: [],
    },
    {
      type: "error",
      name: "ApprovalCallerNotOwnerNorApproved",
      inputs: [],
    },
    {
      type: "error",
      name: "ApprovalQueryForNonexistentToken",
      inputs: [],
    },
    {
      type: "error",
      name: "ApprovalToCurrentOwner",
      inputs: [],
    },
    {
      type: "error",
      name: "ApproveToCaller",
      inputs: [],
    },
  ],
};

export async function getABI(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
  }>({
    method: "GET",
    url: "/contract/:network/:contract_address/metadata/abi",
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
      const { network, contract_address } = request.params;

      const contract = await getContractInstance(network, contract_address);

      let returnData = contract.abi;

      reply.status(StatusCodes.OK).send({
        result: returnData,
      });
    },
  });
}
