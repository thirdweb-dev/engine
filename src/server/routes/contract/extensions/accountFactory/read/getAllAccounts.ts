import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getContract } from "../../../../../../utils/cache/getContract";
import {
  requestParamSchema,
  standardResponseSchema,
} from "../../../../../schemas/sharedApiSchemas";
import { getChainIdFromChain } from "../../../../../utils/chain";

const ReplySchema = Type.Object({
  result: Type.Array(Type.String(), {
    description: "The account addresses of all the accounts in this factory",
  }),
});

export const getAllAccounts = async (fastify: FastifyInstance) => {
  fastify.route<{
    Params: Static<typeof requestParamSchema>;
    Reply: Static<typeof ReplySchema>;
  }>({
    method: "GET",
    url: "/contract/:chain/:contractAddress/account-factory/get-all-accounts",
    schema: {
      summary: "Get all smart accounts",
      description: "Get all the smart accounts for this account factory.",
      tags: ["Account Factory"],
      operationId: "getAllAccounts",
      params: requestParamSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: ReplySchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, contractAddress, simulateTx } = request.params;
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
