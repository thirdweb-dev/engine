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
  signerAddress: Type.String(),
  approvedCallTargets: Type.Array(Type.String()),
  startDate: Type.Optional(Type.String()),
  expirationDate: Type.Optional(Type.String()),
  nativeTokenLimitPerTransaction: Type.Optional(Type.String()),
});

export const updateSession = async (fastify: FastifyInstance) => {
  fastify.route<{
    Params: Static<typeof contractParamSchema>;
    Reply: Static<typeof transactionWritesResponseSchema>;
    Body: Static<typeof BodySchema>;
  }>({
    method: "POST",
    url: "/contract/:chain/:contract_address/account/sessions/update",
    schema: {
      description: "Update a session",
      tags: ["Account"],
      operationId: "account:update-session",
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
      const { signerAddress, ...permissions } = req.body;
      const walletAddress = req.headers["x-backend-wallet-address"] as string;
      const accountAddress = req.headers["x-account-address"] as string;
      const chainId = getChainIdFromChain(chain);

      const contract = await getContract({
        chainId,
        contractAddress: contract_address,
        walletAddress,
        accountAddress,
      });

      const tx = await contract.account.updatePermissions.prepare(
        signerAddress,
        {
          startDate: permissions.startDate
            ? new Date(permissions.startDate)
            : undefined,
          expirationDate: permissions.expirationDate
            ? new Date(permissions.expirationDate)
            : undefined,
          approvedCallTargets: permissions.approvedCallTargets,
          nativeTokenLimitPerTransaction:
            permissions.nativeTokenLimitPerTransaction,
        },
      );
      const queueId = await queueTx({ tx, chainId, extension: "account" });

      rep.status(StatusCodes.OK).send({
        result: {
          queueId,
        },
      });
    },
  });
};
