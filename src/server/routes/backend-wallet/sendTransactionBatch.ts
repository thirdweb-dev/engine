import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { v4 } from "uuid";
import { prisma } from "../../../db/client";
import { standardResponseSchema } from "../../schemas/sharedApiSchemas";
import {
  walletHeaderSchema,
  walletHeaderWithoutSmarAccountSchema,
} from "../../schemas/wallet";
import { getChainIdFromChain } from "../../utils/chain";

const ParamsSchema = Type.Object({
  chain: Type.String(),
});

const BodySchema = Type.Array(
  Type.Object({
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
  }),
);

const ReplySchema = Type.Object({
  result: Type.Object({
    groupId: Type.String(),
    queueIds: Type.Array(Type.String()),
  }),
});

export async function sendTransactionBatch(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof ParamsSchema>;
    Body: Static<typeof BodySchema>;
    Reply: Static<typeof ReplySchema>;
  }>({
    method: "POST",
    url: "/backend-wallet/:chain/send-transaction-batch",
    schema: {
      summary: "Send a batch of raw transactions",
      description:
        "Send a batch of raw transactions with transaction parameters",
      tags: ["Backend Wallet"],
      operationId: "sendTransactionBatch",
      params: ParamsSchema,
      body: BodySchema,
      headers: walletHeaderWithoutSmarAccountSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: ReplySchema,
      },
    },
    handler: async (request, reply) => {
      const { chain } = request.params;
      const txs = request.body;
      // The batch endpoint does not support idempotency keys.
      const { "x-backend-wallet-address": fromAddress } =
        request.headers as Static<typeof walletHeaderSchema>;
      const chainId = await getChainIdFromChain(chain);

      const groupId = v4();
      const data = txs.map((tx) => ({
        groupId,
        id: v4(),
        chainId: chainId.toString(),
        fromAddress: fromAddress.toLowerCase(),
        toAddress: tx.toAddress?.toLowerCase(),
        data: tx.data,
        value: tx.value,
      }));

      await prisma.transactions.createMany({
        data,
      });

      reply.status(StatusCodes.OK).send({
        result: {
          groupId,
          queueIds: data.map((tx) => tx.id.toString()),
        },
      });
    },
  });
}
