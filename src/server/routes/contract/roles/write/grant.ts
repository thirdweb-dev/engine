import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { queueTx } from "../../../../../db/transactions/queueTx";
import { getContract } from "../../../../../utils/cache/getContract";
import {
  requestParamSchema,
  standardResponseSchema,
  transactionWritesResponseSchema,
} from "../../../../schemas/sharedApiSchemas";
import { walletAuthSchema } from "../../../../schemas/wallet";
import { getChainIdFromChain } from "../../../../utils/chain";

// INPUTS
const requestSchema = requestParamSchema;
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
    url: "/contract/:chain/:contractAddress/roles/grant",
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
      const { chain, contractAddress, simulateTx } = request.params;
      const { role, address } = request.body;
      const walletAddress = request.headers[
        "x-backend-wallet-address"
      ] as string;
      const accountAddress = request.headers["x-account-address"] as string;
      const chainId = await getChainIdFromChain(chain);
      const contract = await getContract({
        chainId,
        contractAddress,
        walletAddress,
        accountAddress,
      });

      const tx = await contract.roles.grant.prepare(role, address);
      const queueId = await queueTx({
        tx,
        chainId,
        simulateTx,
        extension: "roles",
      });
      reply.status(StatusCodes.OK).send({
        result: {
          queueId,
        },
      });
    },
  });
}
