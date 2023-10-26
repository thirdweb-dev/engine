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
  result: Type.Boolean({
    description: "Whether or not the account has been deployed",
  }),
});

const QuerySchema = Type.Object({
  admin_address: Type.String({
    description:
      "The address of the admin to check if the account address is deployed",
  }),
  extra_data: Type.Optional(
    Type.String({
      description: "Extra data to use in predicting the account address",
    }),
  ),
});

export const isAccountDeployed = async (fastify: FastifyInstance) => {
  fastify.route<{
    Params: Static<typeof contractParamSchema>;
    Reply: Static<typeof ReplySchema>;
    Querystring: Static<typeof QuerySchema>;
  }>({
    method: "GET",
    url: "/contract/:chain/:contractAddress/account-factory/is-account-deployed",
    schema: {
      summary: "Check if deployed",
      description:
        "Check if a smart account has been deployed to the blockchain.",
      tags: ["Account Factory"],
      operationId: "isAccountDeployed",
      params: contractParamSchema,
      querystring: QuerySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: ReplySchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, contractAddress } = request.params;
      const { admin_address, extra_data } = request.query;
      const chainId = getChainIdFromChain(chain);

      const contract = await getContract({
        chainId,
        contractAddress,
      });
      const isDeployed = await contract.accountFactory.isAccountDeployed(
        admin_address,
        extra_data,
      );

      reply.status(StatusCodes.OK).send({
        result: isDeployed,
      });
    },
  });
};
