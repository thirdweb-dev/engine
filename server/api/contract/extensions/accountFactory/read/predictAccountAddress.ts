import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { walletAuthSchema } from "../../../../../../core/schema";
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

const BodySchema = Type.Object({
  admin_address: Type.String({
    description: "The address of the admin to predict the account address for",
  }),
  extra_data: Type.Optional(
    Type.String({
      description: "Extra data to add to use in predicting the account address",
    }),
  ),
});

export const predictAccountAddress = (fastify: FastifyInstance) => {
  fastify.route<{
    Params: Static<typeof contractParamSchema>;
    Reply: Static<typeof ReplySchema>;
    Body: Static<typeof BodySchema>;
  }>({
    method: "GET",
    url: "/contract/:chain/:contract_address/account-factory/predict-account-address",
    schema: {
      description: "Get the counter-factual address of a new smart wallet",
      tags: ["Smart Wallet"],
      operationId: "account-factory:predict-account-address",
      params: contractParamSchema,
      headers: walletAuthSchema,
      body: BodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: ReplySchema,
      },
    },
    handler: async (req, rep) => {
      const { chain, contract_address } = req.params;
      const { admin_address, extra_data } = req.body;
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
