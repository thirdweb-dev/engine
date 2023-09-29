import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { walletAuthSchema } from "../../../../../../core/schema";
import { queueTx } from "../../../../../../src/db/transactions/queueTx";
import {
  contractParamSchema,
  standardResponseSchema,
  transactionWritesResponseSchema,
} from "../../../../../helpers";
import { getChainIdFromChain } from "../../../../../utilities/chain";
import { getContract } from "../../../../../utils/cache/getContract";

const BodySchema = Type.Object({
  admin_address: Type.String({
    description: "The admin address to create an account for",
  }),
  extra_data: Type.Optional(
    Type.String({
      description: "Extra data to add to use in creating the account address",
    }),
  ),
});

export const createAccount = async (fastify: FastifyInstance) => {
  fastify.route<{
    Params: Static<typeof contractParamSchema>;
    Reply: Static<typeof transactionWritesResponseSchema>;
    Body: Static<typeof BodySchema>;
  }>({
    method: "POST",
    url: "/contract/:chain/:contract_address/account-factory/create-account",
    schema: {
      summary: "Create smart account",
      description: "Create a smart account for this account factory.",
      tags: ["Account Factory"],
      operationId: "account-factory:create-account",
      params: contractParamSchema,
      headers: walletAuthSchema,
      body: BodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: transactionWritesResponseSchema,
      },
    },
    handler: async (req, rep) => {
      const { chain, contract_address } = req.params;
      const { admin_address, extra_data } = req.body;
      const walletAddress = req.headers["x-backend-wallet-address"] as string;
      const accountAddress = req.headers["x-account-address"] as string;
      const chainId = getChainIdFromChain(chain);

      const contract = await getContract({
        chainId,
        walletAddress,
        contractAddress: contract_address,
        accountAddress,
      });
      const tx = await contract.accountFactory.createAccount.prepare(
        admin_address,
        extra_data,
      );
      const queueId = await queueTx({
        tx,
        chainId,
        extension: "account-factory",
      });

      rep.status(StatusCodes.OK).send({
        result: queueId,
      });
    },
  });
};
