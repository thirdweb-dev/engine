import { type Static, Type } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { predictAddress } from "thirdweb/wallets/smart";
import { getContractV5 } from "../../../../../../utils/cache/getContractv5";
import { AddressSchema } from "../../../../../schemas/address";
import {
  contractParamSchema,
  standardResponseSchema,
} from "../../../../../schemas/sharedApiSchemas";
import { getChainIdFromChain } from "../../../../../utils/chain";

const responseBodySchema = Type.Object({
  result: Type.String({
    description: "New account counter-factual address.",
  }),
});

const QuerySchema = Type.Object({
  adminAddress: {
    ...AddressSchema,
    description: "The address of the admin to predict the account address for",
  },
  extraData: Type.Optional(
    Type.String({
      description:
        "Extra data (account salt) to add to use in predicting the account address",
    }),
  ),
});

export const predictAccountAddress = async (fastify: FastifyInstance) => {
  fastify.route<{
    Params: Static<typeof contractParamSchema>;
    Reply: Static<typeof responseBodySchema>;
    Querystring: Static<typeof QuerySchema>;
  }>({
    method: "GET",
    url: "/contract/:chain/:contractAddress/account-factory/predict-account-address",
    schema: {
      summary: "Predict smart account address",
      description: "Get the counterfactual address of a smart account.",
      tags: ["Account Factory"],
      operationId: "predictAccountAddress",
      params: contractParamSchema,
      querystring: QuerySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseBodySchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, contractAddress } = request.params;
      const { adminAddress, extraData } = request.query;
      const chainId = await getChainIdFromChain(chain);
      const factoryContract = await getContractV5({
        chainId,
        contractAddress,
      });

      const accountAddress = await predictAddress({
        factoryContract,
        adminAddress,
        accountSalt: extraData,
      });

      reply.status(StatusCodes.OK).send({
        result: accountAddress,
      });
    },
  });
};
