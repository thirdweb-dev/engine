import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import {
  contractParamSchema,
  standardResponseSchema,
} from "../../../../../schemas/sharedApiSchemas";
import { getContract } from "../../../../../utils/cache/getContract";
import { getChainIdFromChain } from "../../../../../utils/chain";

const ReplySchema = Type.Object({
  result: Type.Array(Type.String(), {
    description:
      "The account addresses of all the accounts with a specific signer in this factory",
  }),
});

const QuerySchema = Type.Object({
  signer_address: Type.String({
    description: "The address of the signer to get associated accounts from",
  }),
});

export const getAssociatedAccounts = async (fastify: FastifyInstance) => {
  fastify.route<{
    Params: Static<typeof contractParamSchema>;
    Reply: Static<typeof ReplySchema>;
    Querystring: Static<typeof QuerySchema>;
  }>({
    method: "GET",
    url: "/contract/:chain/:contract_address/account-factory/get-associated-accounts",
    schema: {
      summary: "Get associated smart accounts",
      description:
        "Get all the smart accounts for this account factory associated with the specific admin wallet.",
      tags: ["Account Factory"],
      operationId: "getAssociatedAccounts",
      params: contractParamSchema,
      querystring: QuerySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: ReplySchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, contract_address } = request.params;
      const { signer_address } = request.query;
      const chainId = getChainIdFromChain(chain);

      const contract = await getContract({
        chainId,
        contractAddress: contract_address,
      });
      const accountAddresses =
        await contract.accountFactory.getAssociatedAccounts(signer_address);

      reply.status(StatusCodes.OK).send({
        result: accountAddresses,
      });
    },
  });
};
