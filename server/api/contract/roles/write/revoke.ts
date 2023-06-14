import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getContractInstance } from "../../../../../core";
import {
  contractParamSchema,
  standardResponseSchema,
  transactionWritesResponseSchema,
} from "../../../../helpers/sharedApiSchemas";
import { Static, Type } from "@sinclair/typebox";
import { queueTransaction } from "../../../../helpers";

// INPUTS
const requestSchema = contractParamSchema;
const requestBodySchema = Type.Object({
  role: Type.String({
    description: "The role to revoke",
  }),
  address: Type.String({
    description: "The address to revoke the role from",
  }),
});

// OUTPUT
const responseSchema = transactionWritesResponseSchema;

export async function revokeRole(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
    Body: Static<typeof requestBodySchema>;
  }>({
    method: "POST",
    url: "/contract/:network/:contract_address/roles/revoke",
    schema: {
      description: "Revoke a role from a specific address",
      tags: ["Contract-Roles"],
      operationId: "roles_revoke",
      params: requestSchema,
      body: requestBodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { network, contract_address } = request.params;
      const { role, address } = request.body;
      const contract = await getContractInstance(network, contract_address);

      const tx = await contract.roles.revoke.prepare(role, address);
      const queuedId = await queueTransaction(
        request,
        tx,
        network,
        "contract_roles",
      );
      reply.status(StatusCodes.OK).send({
        result: queuedId,
      });
    },
  });
}
