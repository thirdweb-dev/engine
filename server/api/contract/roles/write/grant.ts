import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getContractInstance } from "../../../../../core";
import { queueTx } from "../../../../../src/db/transactions/queueTx";
import {
  contractParamSchema,
  standardResponseSchema,
  transactionWritesResponseSchema,
} from "../../../../helpers/sharedApiSchemas";
import { getChainIdFromChain } from "../../../../utilities/chain";

// INPUTS
const requestSchema = contractParamSchema;
const requestBodySchema = Type.Object({
  role: Type.String({
    description: "The role to grant to the address",
  }),
  address: Type.String({
    description: "The address to grant the role to.",
  }),
});

// OUTPUT
const responseSchema = transactionWritesResponseSchema;

export async function grantRole(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
    Body: Static<typeof requestBodySchema>;
  }>({
    method: "POST",
    url: "/contract/:network/:contract_address/roles/grant",
    schema: {
      description: "Grant a role to a specific address",
      tags: ["Contract-Roles"],
      operationId: "roles_grant",
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
      const chainId = getChainIdFromChain(network);

      const tx = await contract.roles.grant.prepare(role, address);
      const queuedId = await queueTx({ tx, chainId, extension: "roles" });
      reply.status(StatusCodes.OK).send({
        result: queuedId,
      });
    },
  });
}
