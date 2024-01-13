import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { queueTx } from "../../../../../../db/transactions/queueTx";
import { getContract } from "../../../../../../utils/cache/getContract";
import {
  requestParamSchema,
  standardResponseSchema,
  transactionWritesResponseSchema,
} from "../../../../../schemas/sharedApiSchemas";
import { walletAuthSchema } from "../../../../../schemas/wallet";
import { getChainIdFromChain } from "../../../../../utils/chain";

const BodySchema = Type.Object({
  signerAddress: Type.String({
    description: "Address to grant admin permissions to",
  }),
});

BodySchema.examples = [
  {
    signerAddress: "0x3ecdbf3b911d0e9052b64850693888b008e18373",
  },
];

export const grantAdmin = async (fastify: FastifyInstance) => {
  fastify.route<{
    Params: Static<typeof requestParamSchema>;
    Reply: Static<typeof transactionWritesResponseSchema>;
    Body: Static<typeof BodySchema>;
  }>({
    method: "POST",
    url: "/contract/:chain/:contractAddress/account/admins/grant",
    schema: {
      summary: "Grant admin",
      description: "Grant a smart account's admin permission.",
      tags: ["Account"],
      operationId: "grantAdmin",
      headers: walletAuthSchema,
      params: requestParamSchema,
      body: BodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: transactionWritesResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, contractAddress, simulateTx } = request.params;
      const { signerAddress } = request.body;
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

      const tx = await contract.account.grantAdminPermissions.prepare(
        signerAddress,
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
