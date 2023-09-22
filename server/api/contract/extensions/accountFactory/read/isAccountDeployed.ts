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
  result: Type.Boolean({
    description: "Whether or not the account has been deployed",
  }),
});

const BodySchema = Type.Object({
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

export const predictAccountAddress = (fastify: FastifyInstance) => {
  fastify.route<{
    Params: Static<typeof contractParamSchema>;
    Reply: Static<typeof ReplySchema>;
    Body: Static<typeof BodySchema>;
  }>({
    method: "GET",
    url: "/contract/:chain/:contract_address/account-factory/is-account-deployed",
    schema: {
      description:
        "Check if the account for a given admin address has been deployed",
      tags: ["Smart Wallet"],
      operationId: "account-factory:is-account-deployed",
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
      const isDeployed = await contract.accountFactory.isAccountDeployed(
        admin_address,
        extra_data,
      );

      rep.status(StatusCodes.OK).send({
        result: isDeployed,
      });
    },
  });
};
