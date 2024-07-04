import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { createCustomError } from "../../middleware/error";
import { standardResponseSchema } from "../../schemas/sharedApiSchemas";
import { txOverridesWithValueSchema } from "../../schemas/txOverrides";
import { walletHeaderSchema } from "../../schemas/wallet";

const ParamsSchema = Type.Object({
  chain: Type.String(),
});

const requestBodySchema = Type.Array(
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
    ...txOverridesWithValueSchema.properties,
  }),
);

const responseBodySchema = Type.Object({
  result: Type.Object({
    groupId: Type.String(),
    queueIds: Type.Array(Type.String()),
  }),
});

export async function sendTransactionBatch(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof ParamsSchema>;
    Body: Static<typeof requestBodySchema>;
    Reply: Static<typeof responseBodySchema>;
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
      body: requestBodySchema,
      headers: walletHeaderSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseBodySchema,
      },
      hide: true,
      deprecated: true,
    },
    handler: async (request, reply) => {
      throw createCustomError(
        "This endpoint is deprecated",
        StatusCodes.GONE,
        "ENDPOINT_DEPRECATED",
      );
    },
  });
}
