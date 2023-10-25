import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { queueTx } from "../../../../../src/db/transactions/queueTx";
import {
  contractParamSchema,
  standardResponseSchema,
  transactionWritesResponseSchema,
} from "../../../../helpers/sharedApiSchemas";
import { walletAuthSchema } from "../../../../schemas/wallet";
import { getChainIdFromChain } from "../../../../utilities/chain";
import { getContract } from "../../../../utils/cache/getContract";

// INPUTS
const requestSchema = contractParamSchema;
const requestBodySchema = Type.Object({
  role: Type.String({
    description: "The role to grant",
  }),
  address: Type.String({
    description: "The address to grant the role to",
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
    url: "/contract/:chain/:contract_address/roles/grant",
    schema: {
      summary: "Grant role",
      description: "Grant a role to a specific wallet.",
      tags: ["Contract-Roles"],
      operationId: "grant",
      headers: walletAuthSchema,
      params: requestSchema,
      body: requestBodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, contract_address } = request.params;
      const { role, address } = request.body;
      const walletAddress = request.headers[
        "x-backend-wallet-address"
      ] as string;
      const accountAddress = request.headers["x-account-address"] as string;
      const chainId = getChainIdFromChain(chain);
      const contract = await getContract({
        chainId,
        contractAddress: contract_address,
        walletAddress,
        accountAddress,
      });

      const tx = await contract.roles.grant.prepare(role, address);
      const queueId = await queueTx({ tx, chainId, extension: "roles" });
      reply.status(StatusCodes.OK).send({
        result: {
          queueId,
        },
      });
    },
  });
}
