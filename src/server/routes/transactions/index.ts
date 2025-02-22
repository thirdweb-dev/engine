import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { resolver, validator as zValidator } from "hono-openapi/zod";
import { ResultAsync } from "neverthrow";
import { z } from "zod";
import { db } from "../../../db/connection";
import { mapDbError } from "../../../lib/errors";
import { wrapResponseSchema } from "../../schemas/shared-api-schemas";
import { transactionDbEntrySchema } from "../../../db/derived-schemas";

export const transactionsRoutes = new Hono();

transactionsRoutes.get(
  "/:id",
  zValidator("param", z.object({ id: z.string() })),
  describeRoute({
    summary: "Get Transaction by ID",
    description: "Retrieve a transaction by its ID",
    tags: ["Transactions"],
    operationId: "getTransactionById",
    responses: {
      200: {
        description: "Transaction found",
        content: {
          "application/json": {
            schema: resolver(
              wrapResponseSchema(z.array(transactionDbEntrySchema)),
            ),
          },
        },
      },
    },
  }),
  async (c) => {
    const { id } = c.req.valid("param");

    const result = await ResultAsync.fromPromise(
      db.query.transactions.findMany({
        where: (transactions, { eq }) => eq(transactions.id, id),
      }),
      mapDbError,
    );

    if (result.isErr()) {
      throw result.error;
    }

    return c.json({
      result: {
        transactions: result.value,
      },
    });
  },
);
