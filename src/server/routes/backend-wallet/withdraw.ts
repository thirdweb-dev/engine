import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { Address } from "thirdweb";
import { insertTransaction } from "../../../utils/transaction/insertTransaction";
import {
  requestQuerystringSchema,
  standardResponseSchema,
  transactionWritesResponseSchema,
} from "../../schemas/sharedApiSchemas";
import { walletHeaderSchema, walletParamSchema } from "../../schemas/wallet";
import { getChainIdFromChain } from "../../utils/chain";

const ParamsSchema = Type.Omit(walletParamSchema, ["walletAddress"]);

const requestBodySchema = Type.Object({
  toAddress: Type.String({
    description: "Address to withdraw all funds to",
  }),
});

export async function withdraw(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof ParamsSchema>;
    Reply: Static<typeof transactionWritesResponseSchema>;
    Body: Static<typeof requestBodySchema>;
    Querystring: Static<typeof requestQuerystringSchema>;
  }>({
    method: "POST",
    url: "/backend-wallet/:chain/withdraw",
    schema: {
      summary: "Withdraw all funds",
      description: "Withdraw all funds from this wallet to another wallet",
      tags: ["Backend Wallet"],
      operationId: "withdraw",
      params: ParamsSchema,
      body: requestBodySchema,
      headers: walletHeaderSchema,
      querystring: requestQuerystringSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: transactionWritesResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain } = request.params;
      const { simulateTx } = request.query;
      const { toAddress } = request.body;
      const {
        "x-backend-wallet-address": walletAddress,
        "x-idempotency-key": idempotencyKey,
      } = request.headers as Static<typeof walletHeaderSchema>;

      const chainId = await getChainIdFromChain(chain);

      const { queueId } = await insertTransaction({
        insertedTransaction: {
          chainId,
          from: walletAddress as Address,
          to: toAddress as Address,
          data: "0x00",

          extension: "withdraw",
          functionName: "transfer",
        },
        idempotencyKey,
        shouldSimulate: simulateTx,
      });

      reply.status(StatusCodes.OK).send({
        result: {
          queueId,
        },
      });
    },
  });
}
