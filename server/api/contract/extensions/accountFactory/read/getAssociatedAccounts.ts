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
  result: Type.Array(Type.String(), {
    description:
      "The account addresses of all the accounts with a specific signer in this factory",
  }),
});

const BodySchema = Type.Object({
  signer_address: Type.String({
    description: "The address of the signer to get associated accounts from",
  }),
});

export const getAssociatedAccounts = (fastify: FastifyInstance) => {
  fastify.route<{
    Params: Static<typeof contractParamSchema>;
    Reply: Static<typeof ReplySchema>;
    Body: Static<typeof BodySchema>;
  }>({
    method: "GET",
    url: "/contract/:chain/:contract_address/account-factory/get-associated-accounts",
    schema: {
      description:
        "Get all the accounts on an account factory with a specified wallet as a signer",
      tags: ["Smart Wallet"],
      operationId: "account-factory:get-associated-accounts",
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
      const { signer_address } = req.body;
      const chainId = getChainIdFromChain(chain);

      const contract = await getContract({
        chainId,
        contractAddress: contract_address,
      });
      const accountAddresses =
        await contract.accountFactory.getAssociatedAccounts(signer_address);

      rep.status(StatusCodes.OK).send({
        result: accountAddresses,
      });
    },
  });
};
