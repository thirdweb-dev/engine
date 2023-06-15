import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getContractInstance } from "../../../../../core";
import {
  contractParamSchema,
  standardResponseSchema,
} from "../../../../helpers/sharedApiSchemas";
import { Static, Type } from "@sinclair/typebox";

const requestSchema = contractParamSchema;
const querystringSchema = Type.Object({
  role: Type.String({
    description: "The Role to to get a memberlist for.",
  }),
});

// OUTPUT
const responseSchema = Type.Object({
  result: Type.Array(Type.String()),
});

responseSchema.examples = [
  {
    result: ["0x1946267d81Fb8aDeeEa28e6B98bcD446c8248473"],
  },
];

export async function getRoles(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
    Querystring: Static<typeof querystringSchema>;
  }>({
    method: "GET",
    url: "/contract/:network/:contract_address/roles/get",
    schema: {
      description: "Get all members of a specific role",
      tags: ["Contract-Roles"],
      operationId: "roles_getRole",
      params: requestSchema,
      querystring: querystringSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { network, contract_address } = request.params;
      const { role } = request.query;

      const contract = await getContractInstance(network, contract_address);

      let returnData = await contract.roles.get(role);

      reply.status(StatusCodes.OK).send({
        result: returnData,
      });
    },
  });
}
