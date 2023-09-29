import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import {
  contractParamSchema,
  standardResponseSchema,
} from "../../../../../helpers";
import { getChainIdFromChain } from "../../../../../utilities/chain";
import { getContract } from "../../../../../utils/cache/getContract";

const ReplySchema = Type.Object({
  result: Type.String({
    description: "New account counter-factual address.",
  }),
});

const QuerySchema = Type.Object({
  admin_address: Type.String({
    description: "The address of the admin to predict the account address for",
  }),
  extra_data: Type.Optional(
    Type.String({
      description: "Extra data to add to use in predicting the account address",
    }),
  ),
});

export const predictAccountAddress = async (fastify: FastifyInstance) => {
  fastify.route<{
    Params: Static<typeof contractParamSchema>;
    Reply: Static<typeof ReplySchema>;
    Querystring: Static<typeof QuerySchema>;
  }>({
    method: "GET",
    url: "/contract/:chain/:contract_address/account-factory/predict-account-address",
    schema: {
      summary: "Predict smart account address",
      description: "Get the counterfactual address of a smart account.",
      tags: ["Account Factory"],
      operationId: "account-factory:predict-account-address",
      params: contractParamSchema,
      querystring: QuerySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: ReplySchema,
      },
    },
    handler: async (req, rep) => {
      const { chain, contract_address } = req.params;
      const { admin_address, extra_data } = req.query;
      const chainId = getChainIdFromChain(chain);

      const contract = await getContract({
        chainId,
        contractAddress: contract_address,
      });
      const accountAddress =
        await contract.accountFactory.predictAccountAddress(
          admin_address,
          extra_data,
        );

      rep.status(StatusCodes.OK).send({
        result: accountAddress,
      });
    },
  });
};
