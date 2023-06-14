import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getContractInstance } from "../../../../../core";
import {
  contractParamSchema,
  standardResponseSchema,
} from "../../../../helpers/sharedApiSchemas";
import { Static, Type } from "@sinclair/typebox";
import { roleKeySchema } from "../../../../schemas/contract";

const requestSchema = contractParamSchema;

// OUTPUT
const responseSchema = Type.Object({
  result: roleKeySchema, //Type.Any(),
});

export async function getAllRoles(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
  }>({
    method: "GET",
    url: "/contract/:network/:contract_address/roles/getAll",
    schema: {
      description: "Get all members of all roles",
      tags: ["Contract-Roles"],
      operationId: "roles_getAll",
      params: requestSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { network, contract_address } = request.params;

      const contract = await getContractInstance(network, contract_address);

      let returnData = (await contract.roles.getAll()) as Static<
        typeof responseSchema
      >["result"];

      reply.status(StatusCodes.OK).send({
        result: returnData,
      });
    },
  });
}
