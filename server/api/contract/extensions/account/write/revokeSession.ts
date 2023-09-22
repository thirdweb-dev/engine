import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { queueTx } from "../../../../../../src/db/transactions/queueTx";
import {
  contractParamSchema,
  standardResponseSchema,
  transactionWritesResponseSchema,
} from "../../../../../helpers";
import { getChainIdFromChain } from "../../../../../utilities/chain";
import { getContract } from "../../../../../utils/cache/getContract";

const BodySchema = Type.Object({
  wallet_address: Type.String({
    description: "Address to revoke session from",
  }),
});

export const revokeSession = async (fastify: FastifyInstance) => {
  fastify.route<{
    Params: Static<typeof contractParamSchema>;
    Reply: Static<typeof transactionWritesResponseSchema>;
    Body: Static<typeof BodySchema>;
  }>({
    method: "POST",
    url: "/contract/:chain/:contract_address/account/sessions/revoke",
    schema: {
      description: "Revoke a session",
      tags: ["Account"],
      operationId: "account:revoke-session",
      params: contractParamSchema,
      body: BodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: transactionWritesResponseSchema,
      },
    },
    handler: async (req, rep) => {
      const { chain, contract_address } = req.params;
      const { wallet_address } = req.body;
      const chainId = getChainIdFromChain(chain);

      const contract = await getContract({
        chainId,
        contractAddress: contract_address,
      });

      // TODO: Bruh we need prepare....
      const tx = await contract.account.revokeAccess(wallet_address);
      // @ts-expect-error
      const queueId = await queueTx({ tx, chainId, extension: "account" });

      rep.status(StatusCodes.OK).send({
        result: queueId,
      });
    },
  });
};
