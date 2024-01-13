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
  result: Type.String({
    description: "New account counter-factual address.",
  }),
});

const QuerySchema = Type.Object({
  adminAddress: Type.String({
    description: "The address of the admin to predict the account address for",
  }),
  extraData: Type.Optional(
    Type.String({
      description: "Extra data to add to use in predicting the account address",
    }),
  ),
});

export const predictAccountAddress = async (fastify: FastifyInstance) => {
  fastify.route<{
    Params: Static<typeof requestParamSchema>;
    Reply: Static<typeof ReplySchema>;
    Querystring: Static<typeof QuerySchema>;
  }>({
    method: "GET",
    url: "/contract/:chain/:contractAddress/account-factory/predict-account-address",
    schema: {
      summary: "Predict smart account address",
      description: "Get the counterfactual address of a smart account.",
      tags: ["Account Factory"],
      operationId: "predictAccountAddress",
      params: requestParamSchema,
      querystring: QuerySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: ReplySchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, contractAddress, simulateTx } = request.params;
      const { adminAddress, extraData } = request.query;
      const chainId = await getChainIdFromChain(chain);

      const contract = await getContract({
        chainId,
        contractAddress,
      });
      const accountAddress =
        await contract.accountFactory.predictAccountAddress(
          adminAddress,
          extraData,
        );

      reply.status(StatusCodes.OK).send({
        result: accountAddress,
      });
    },
  });
};
