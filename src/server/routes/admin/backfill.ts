import { type Static, Type } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { TransactionDB } from "../../../shared/db/transactions/db";
import { standardResponseSchema } from "../../schemas/shared-api-schemas";

// SPECIAL LOGIC FOR AMEX
// Two admin routes to backfill transaction data:
// - loadBackfillRoute: Load queueId to status/transactionHash mappings
// - clearBackfillRoute: Clear all backfill entries
// See https://github.com/thirdweb-dev/solutions-customer-scripts/blob/main/amex/scripts/load-backfill-via-api.ts

const MinedEntrySchema = Type.Object({
  queueId: Type.String({ description: "Queue ID (UUID)" }),
  status: Type.Literal("mined"),
  transactionHash: Type.String({ description: "Transaction hash (0x...)" }),
});

const ErroredEntrySchema = Type.Object({
  queueId: Type.String({ description: "Queue ID (UUID)" }),
  status: Type.Literal("errored"),
});

const loadRequestBodySchema = Type.Object({
  entries: Type.Array(
    Type.Union([MinedEntrySchema, ErroredEntrySchema], {
      description: "Entry with status 'mined' requires transactionHash; status 'errored' does not",
    }),
    {
      description: "Array of queueId to status/transactionHash mappings",
      maxItems: 10000,
    },
  ),
});

const loadResponseBodySchema = Type.Object({
  result: Type.Object({
    inserted: Type.Integer({ description: "Number of entries inserted" }),
    skipped: Type.Integer({
      description: "Number of entries skipped (already exist)",
    }),
  }),
});

const clearResponseBodySchema = Type.Object({
  result: Type.Object({
    deleted: Type.Integer({ description: "Number of entries deleted" }),
  }),
});

export async function loadBackfillRoute(fastify: FastifyInstance) {
  fastify.route<{
    Body: Static<typeof loadRequestBodySchema>;
    Reply: Static<typeof loadResponseBodySchema>;
  }>({
    method: "POST",
    url: "/admin/backfill",
    schema: {
      summary: "Load backfill entries",
      description:
        "Load queueId to transactionHash mappings into the backfill table. Uses SETNX to never overwrite existing entries.",
      tags: ["Admin"],
      operationId: "loadBackfill",
      body: loadRequestBodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: loadResponseBodySchema,
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

export async function clearBackfillRoute(fastify: FastifyInstance) {
  fastify.route<{
    Reply: Static<typeof clearResponseBodySchema>;
  }>({
    method: "DELETE",
    url: "/admin/backfill",
    schema: {
      summary: "Clear backfill table",
      description:
        "Delete all entries from the backfill table. This action cannot be undone.",
      tags: ["Admin"],
      operationId: "clearBackfill",
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: clearResponseBodySchema,
      },
      hide: true,
    },
    handler: async (_request, reply) => {
      const deleted = await TransactionDB.clearBackfill();

      reply.status(StatusCodes.OK).send({
        result: { deleted },
      });
    },
  });
}
