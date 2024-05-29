import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { queueTxRaw } from "../../../db/transactions/queueTxRaw";
import {
  standardResponseSchema,
  transactionWritesResponseSchema,
} from "../../schemas/sharedApiSchemas";
import {
  walletHeaderSchema,
  walletHeaderWithoutSmarAccountSchema,
  walletParamSchema,
} from "../../schemas/wallet";
import { getChainIdFromChain } from "../../utils/chain";

const ParamsSchema = Type.Omit(walletParamSchema, ["walletAddress"]);

const BodySchema = Type.Object({
  toAddress: Type.String({
    description: "Address to withdraw all funds to",
  }),
});

export async function withdraw(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof ParamsSchema>;
    Reply: Static<typeof transactionWritesResponseSchema>;
    Body: Static<typeof BodySchema>;
  }>({
    method: "POST",
    url: "/backend-wallet/:chain/withdraw",
    schema: {
      summary: "Withdraw all funds",
      description: "Withdraw all funds from this wallet to another wallet",
      tags: ["Backend Wallet"],
      operationId: "withdraw",
      params: ParamsSchema,
      body: BodySchema,
      headers: walletHeaderWithoutSmarAccountSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: transactionWritesResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain } = request.params;
      const { toAddress } = request.body;
      const {
        "x-backend-wallet-address": walletAddress,
        "x-idempotency-key": idempotencyKey,
      } = request.headers as Static<typeof walletHeaderSchema>;

      const chainId = await getChainIdFromChain(chain);

      const { id: queueId } = await queueTxRaw({
        chainId: chainId.toString(),
        extension: "withdraw",
        functionName: "transfer",
        fromAddress: walletAddress,
        toAddress,
        data: "0x",
        idempotencyKey,
      });

      reply.status(StatusCodes.OK).send({
        result: {
          queueId,
        },
      });
    },
  });
}
