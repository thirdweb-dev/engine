import { type Static, Type } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getContract } from "../../../../../../shared/utils/cache/get-contract";
import {
  contractParamSchema,
  standardResponseSchema,
} from "../../../../../schemas/sharedApiSchemas";
import { getChainIdFromChain } from "../../../../../utils/chain";

const responseBodySchema = Type.Object({
  result: Type.Array(Type.String(), {
    description: "The account addresses of all the accounts in this factory",
  }),
});

export const getAllAccounts = async (fastify: FastifyInstance) => {
  fastify.route<{
    Params: Static<typeof contractParamSchema>;
    Reply: Static<typeof responseBodySchema>;
  }>({
    method: "GET",
    url: "/contract/:chain/:contractAddress/account-factory/get-all-accounts",
    schema: {
      summary: "Get all smart accounts",
      description: "Get all the smart accounts for this account factory.",
      tags: ["Account Factory"],
      operationId: "getAllAccounts",
      params: contractParamSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseBodySchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, contractAddress } = request.params;
      const chainId = await getChainIdFromChain(chain);

      const contract = await getContract({
        chainId,
        contractAddress,
      });
      const accountAddresses = await contract.accountFactory.getAllAccounts();

      reply.status(StatusCodes.OK).send({
        result: accountAddresses,
      });
    },
  });
};
