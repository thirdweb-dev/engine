import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { queueTxRaw } from "../../../db/transactions/queueTxRaw";
import {
  requestQuerystringSchema,
  standardResponseSchema,
  transactionWritesResponseSchema,
} from "../../schemas/sharedApiSchemas";
import { walletHeaderSchema } from "../../schemas/wallet";
import { getChainIdFromChain } from "../../utils/chain";

const ParamsSchema = Type.Object({
  chain: Type.String(),
});

const requestBodySchema = Type.Object({
  toAddress: Type.Optional(
    Type.String({
      examples: ["0x..."],
    }),
  ),
  data: Type.String({
    examples: ["0x..."],
  }),
  value: Type.String({
    examples: ["10000000"],
  }),
});

requestBodySchema.examples = [
  {
    toAddress: "0x7a0ce8524bea337f0bee853b68fabde145dac0a0",
    data: "0x449a52f800000000000000000000000043cae0d7fe86c713530e679ce02574743b2ee9fc0000000000000000000000000000000000000000000000000de0b6b3a7640000",
    value: "0",
  },
];

export async function sendTransaction(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof ParamsSchema>;
    Body: Static<typeof requestBodySchema>;
    Reply: Static<typeof transactionWritesResponseSchema>;
    Querystring: Static<typeof requestQuerystringSchema>;
  }>({
    method: "POST",
    url: "/backend-wallet/:chain/send-transaction",
    schema: {
      summary: "Send a transaction",
      description: "Send a transaction with transaction parameters",
      tags: ["Backend Wallet"],
      operationId: "sendTransaction",
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
      const { toAddress, data, value } = request.body;
      const { simulateTx } = request.query;
      const {
        "x-backend-wallet-address": fromAddress,
        "x-idempotency-key": idempotencyKey,
      } = request.headers as Static<typeof walletHeaderSchema>;
      const chainId = await getChainIdFromChain(chain);

      const queueId = await queueTxRaw({
        tx: {
          chainId: chainId.toString(),
          fromAddress,
          toAddress,
          data,
          value,
          idempotencyKey,
        },
        simulateTx,
      });

      reply.status(StatusCodes.OK).send({
        result: {
          queueId,
        },
      });
    },
  });
}
