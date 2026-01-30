import { type Static, Type } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { TransactionDB } from "../../../shared/db/transactions/db";
import { standardResponseSchema } from "../../schemas/shared-api-schemas";

const requestBodySchema = Type.Object({
  entries: Type.Array(
    Type.Object({
      queueId: Type.String({ description: "Queue ID (UUID)" }),
      transactionHash: Type.String({ description: "Transaction hash (0x...)" }),
    }),
    { description: "Array of queueId to transactionHash mappings", maxItems: 10000 },
  ),
});

const responseBodySchema = Type.Object({
  result: Type.Object({
    inserted: Type.Integer({ description: "Number of entries inserted" }),
    skipped: Type.Integer({
      description: "Number of entries skipped (already exist)",
    }),
  }),
});

export async function loadBackfillRoute(fastify: FastifyInstance) {
  fastify.route<{
    Body: Static<typeof requestBodySchema>;
    Reply: Static<typeof responseBodySchema>;
  }>({
    method: "POST",
    url: "/admin/backfill",
    schema: {
      summary: "Load backfill entries",
      description:
        "Load queueId to transactionHash mappings into the backfill table. Uses SETNX to never overwrite existing entries.",
      tags: ["Admin"],
      operationId: "loadBackfill",
      body: requestBodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseBodySchema,
      },
      hide: true,
    },
    handler: async (request, reply) => {
      const { entries } = request.body;

      const { inserted, skipped } =
        await TransactionDB.bulkSetBackfill(entries);

      reply.status(StatusCodes.OK).send({
        result: { inserted, skipped },
      });
    },
  });
}
