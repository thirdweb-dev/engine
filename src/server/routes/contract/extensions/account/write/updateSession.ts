import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { queueTx } from "../../../../../../db/transactions/queueTx";
import { getContract } from "../../../../../../utils/cache/getContract";
import {
  contractParamSchema,
  requestQuerystringSchema,
  standardResponseSchema,
  transactionWritesResponseSchema,
} from "../../../../../schemas/sharedApiSchemas";
import { walletAuthSchema } from "../../../../../schemas/wallet";
import { getChainIdFromChain } from "../../../../../utils/chain";

const BodySchema = Type.Object({
  signerAddress: Type.String(),
  approvedCallTargets: Type.Array(Type.String()),
  startDate: Type.Optional(Type.String()),
  expirationDate: Type.Optional(Type.String()),
  nativeTokenLimitPerTransaction: Type.Optional(Type.String()),
});

BodySchema.examples = [
  {
    signerAddress: "0x3ecdbf3b911d0e9052b64850693888b008e18373",
    approvedCallTargets: ["0x1946267d81Fb8aDeeEa28e6B98bcD446c8248473"],
  },
];

export const updateSession = async (fastify: FastifyInstance) => {
  fastify.route<{
    Params: Static<typeof contractParamSchema>;
    Reply: Static<typeof transactionWritesResponseSchema>;
    Body: Static<typeof BodySchema>;
    Querystring: Static<typeof requestQuerystringSchema>;
  }>({
    method: "POST",
    url: "/contract/:chain/:contractAddress/account/sessions/update",
    schema: {
      summary: "Update session key",
      description: "Update a session key for a smart account.",
      tags: ["Account"],
      operationId: "updateSession",
      params: contractParamSchema,
      headers: walletAuthSchema,
      body: BodySchema,
      querystring: requestQuerystringSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: transactionWritesResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, contractAddress } = request.params;
      const { signerAddress, ...permissions } = request.body;
      const { simulateTx } = request.query;
      const walletAddress = request.headers[
        "x-backend-wallet-address"
      ] as string;
      const accountAddress = request.headers["x-account-address"] as string;
      const chainId = await getChainIdFromChain(chain);

      const contract = await getContract({
        chainId,
        contractAddress,
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
      const queueId = await queueTx({
        tx,
        chainId,
        simulateTx,
        extension: "account",
      });

      reply.status(StatusCodes.OK).send({
        result: {
          queueId,
        },
      });
    },
  });
};
