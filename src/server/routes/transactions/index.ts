import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { resolver, validator as zValidator } from "hono-openapi/zod";
import { ResultAsync } from "neverthrow";
import { z } from "zod";
import { db } from "../../../db/connection.js";
import { mapDbError } from "../../../lib/errors.js";
import {
  wrapResponseSchema,
  requestPaginationSchema,
} from "../../schemas/shared-api-schemas.js";
import { transactionDbEntrySchema } from "../../../db/derived-schemas.js";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { transactions as transactionsTable } from "../../../db/schema.js";
import { evmAddressSchema } from "../../../lib/zod.js";

export const transactionsRoutes = new Hono();

const searchTransactionsSchema = requestPaginationSchema.extend({
  // Search criteria
  id: z.string().optional(),
  batchIndex: z.number().optional(),
  from: evmAddressSchema.optional(),
  signerAddress: evmAddressSchema.optional(),

  // Sorting
  sortBy: z.enum(["createdAt", "confirmedAt"]).default("createdAt"),
  sortDirection: z.enum(["asc", "desc"]).default("desc"),
});

transactionsRoutes.get(
  "/",
  zValidator("query", searchTransactionsSchema),
  describeRoute({
    summary: "Get Transactions",
    description: "Search transactions with various filters and pagination",
    tags: ["Transactions"],
    operationId: "getTransactions",
    responses: {
      200: {
        description: "Transactions",
        content: {
          "application/json": {
            schema: resolver(
              wrapResponseSchema(
                z.object({
                  transactions: z.array(transactionDbEntrySchema),
                  pagination: z.object({
                    totalCount: z.number(),
                    page: z.number(),
                    limit: z.number(),
                  }),
                })
              )
            ),
          },
        },
      },
    },
  }),
  async (c) => {
    const params = c.req.valid("query");
    const skip = (params.page - 1) * params.limit;

    // Build where conditions
    const whereConditions = [];

    if (params.id) {
      whereConditions.push(eq(transactionsTable.id, params.id));
    }

    if (params.batchIndex !== undefined) {
      whereConditions.push(eq(transactionsTable.batchIndex, params.batchIndex));
    }

    if (params.from) {
      whereConditions.push(eq(transactionsTable.from, params.from));
    }

    if (params.signerAddress) {
      // Search in executionParams JSON for signerAddress
      whereConditions.push(
        sql`${transactionsTable.executionParams}->>'signerAddress' = ${params.signerAddress}`
      );
    }

    const baseQuery = {
      where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
      orderBy: [
        params.sortBy === "createdAt"
          ? params.sortDirection === "asc"
            ? asc(transactionsTable.createdAt)
            : desc(transactionsTable.createdAt)
          : params.sortDirection === "asc"
          ? asc(transactionsTable.confirmedAt)
          : desc(transactionsTable.confirmedAt),
      ],
    };

    const combined = await ResultAsync.combine([
      ResultAsync.fromPromise(
        db.query.transactions.findMany({
          ...baseQuery,
          offset: skip,
          limit: params.limit,
        }),
        mapDbError
      ),
      ResultAsync.fromPromise(
        db
          .select({ count: sql<number>`count(*)` })
          .from(transactionsTable)
          .where(baseQuery.where || undefined)
          .then((rows) => rows[0]?.count || 0),
        mapDbError
      ),
    ]);

    if (combined.isErr()) {
      throw combined.error;
    }

    const [txns, totalCount] = combined.value;

    return c.json({
      result: {
        transactions: txns,
        pagination: {
          totalCount,
          page: params.page,
          limit: params.limit,
        },
      },
    });
  }
);
