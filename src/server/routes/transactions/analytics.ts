import { type SQL, and, count, gte, lte, sql } from "drizzle-orm";

import { z } from "zod";
import {
  buildAdvancedFilters,
  filterItemSchema,
  filterOperationSchema,
} from "./filter.js";

import {
  engineErrToHttpException,
  mapDbError,
  type ValidationErr,
} from "../../../lib/errors.js";
import { transactions } from "../../../db/schema.js";
import { describeRoute } from "hono-openapi";
import { resolver, validator as zValidator } from "hono-openapi/zod";
import { wrapResponseSchema } from "../../schemas/shared-api-schemas.js";
import { ResultAsync } from "neverthrow";
import { db } from "../../../db/connection.js";
import { transactionsRoutesFactory } from "./factory.js";

function validateTimeRange(
  startDate: Date,
  endDate: Date,
  resolution: TimeResolution,
): void {
  const durationMs = endDate.getTime() - startDate.getTime();
  const maxDurations: Record<TimeResolution, number> = {
    hour: 48 * 60 * 60 * 1000, // 48 hours
    day: 90 * 24 * 60 * 60 * 1000, // 90 days
    week: 52 * 7 * 24 * 60 * 60 * 1000, // 52 weeks
    month: 24 * 30 * 24 * 60 * 60 * 1000, // ~24 months
  };

  if (durationMs > maxDurations[resolution]) {
    // Create a ValidationErr for the time range validation
    const error: ValidationErr = {
      kind: "validation",
      code: "parse_error",
      status: 400,
      message: `Time range too large for ${resolution} resolution. Maximum duration is ${maxDurations[resolution] / (1000 * 60 * 60 * 24)} days.`,
    };

    // Throw using the engineErrToHttpException helper
    throw engineErrToHttpException(error);
  }
}

// Define the time resolution types
type TimeResolution = "hour" | "day" | "week" | "month";

// Create Zod schema for time resolution
const timeResolutionSchema = z.enum(["hour", "day", "week", "month"]);

// Analytics request schema
const transactionsAnalyticsSchema = z.object({
  // Time range
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  resolution: timeResolutionSchema,

  // Filters (using the same pattern as search)
  filters: z.array(filterItemSchema).optional(),
  filtersOperation: filterOperationSchema.optional().default("AND"),
});

// Get appropriate time bucket SQL expression
function getTimeBucketExpression(resolution: TimeResolution): SQL<string> {
  switch (resolution) {
    case "hour":
      return sql<string>`date_trunc('hour', ${transactions.createdAt})`;
    case "day":
      return sql<string>`date_trunc('day', ${transactions.createdAt})`;
    case "week":
      return sql<string>`date_trunc('week', ${transactions.createdAt})`;
    case "month":
      return sql<string>`date_trunc('month', ${transactions.createdAt})`;
    default:
      throw new Error(`Unsupported resolution: ${resolution}`);
  }
}

export const analyticsHandler = transactionsRoutesFactory.createHandlers(
  zValidator("json", transactionsAnalyticsSchema),
  describeRoute({
    summary: "Transaction Analytics",
    description: "Get transaction count analytics over time with filtering",
    tags: ["Transactions"],
    operationId: "getTransactionAnalytics",
    responses: {
      200: {
        description: "Transaction Analytics",
        content: {
          "application/json": {
            schema: resolver(
              wrapResponseSchema(
                z.object({
                  analytics: z.array(
                    z.object({
                      timeBucket: z.string(),
                      chainId: z.string(),
                      count: z.number(),
                    }),
                  ),
                  metadata: z.object({
                    resolution: timeResolutionSchema,
                    startDate: z.string(),
                    endDate: z.string(),
                  }),
                }),
              ),
            ),
          },
        },
      },
      // 400: {
      //   description: "Bad Request",
      //   content: {
      //     "application/json": {
      //       schema: errorResponseSchema,
      //     },
      //   },
      // },
    },
  }),
  async (c) => {
    const params = c.req.valid("json");

    // Parse dates
    const startDate = new Date(params.startDate);
    const endDate = new Date(params.endDate);

    // Validate time range based on resolution
    validateTimeRange(startDate, endDate, params.resolution);

    // Create the time bucket expression based on resolution
    const timeBucket = getTimeBucketExpression(params.resolution);

    // Build advanced filters if present
    let filtersClause: SQL | undefined;
    if (params.filters && params.filters.length > 0) {
      filtersClause = buildAdvancedFilters(
        params.filters,
        params.filtersOperation,
      );
    }

    // Build the complete where clause
    const whereClause = [
      gte(transactions.createdAt, startDate),
      lte(transactions.createdAt, endDate),
      filtersClause,
    ].filter(Boolean);

    // Execute query
    const result = await ResultAsync.fromPromise(
      db
        .select({
          timeBucket: timeBucket,
          chainId: transactions.chainId,
          count: count(),
        })
        .from(transactions)
        .where(whereClause.length > 0 ? and(...whereClause) : undefined)
        .groupBy(timeBucket, transactions.chainId)
        .orderBy(timeBucket, transactions.chainId),
      mapDbError,
    );

    if (result.isErr()) {
      throw result.error;
    }

    return c.json({
      result: {
        analytics: result.value,
        metadata: {
          resolution: params.resolution,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
      },
    });
  },
);

// Example usage:
/*
POST /transactions/analytics
{
  "startDate": "2023-01-01T00:00:00Z",
  "endDate": "2023-01-31T23:59:59Z",
  "resolution": "day",
  "filters": [
    {
      "field": "chainId",
      "values": ["1", "137"],
      "operation": "OR"
    },
    {
      "field": "signerAddress",
      "values": ["0x1234..."],
      "operation": "OR"
    }
  ],
  "filtersOperation": "AND"
}
*/

// Schema for the request body - Allows nested filters
const analyticsSummaryRequestSchema = z.object({
  startDate: z
    .string()
    .datetime("Start date must be a valid ISO 8601 string")
    .optional(),
  endDate: z
    .string()
    .datetime("End date must be a valid ISO 8601 string")
    .optional(),
  filters: z.array(filterItemSchema).optional(), // Use filterItemSchema for nesting
  filtersOperation: filterOperationSchema.optional().default("AND"),
});

// Schema for the successful response data
const analyticsSummarySuccessSchema = z.object({
  summary: z.object({
    totalCount: z
      .number()
      .int()
      .min(0)
      .describe("Total number of transactions matching the criteria."),
    // Use string for potentially very large numbers from gas calculation sum
    totalGasCostWei: z
      .string()
      .describe(
        "Sum of actualGasCost (in wei) for all matching transactions, as a string.",
      ),
    // ADDED: Total gas units used
    totalGasUnitsUsed: z
      .string()
      .describe(
        "Sum of actualGasUsed (gas units) for all matching transactions, as a string.",
      ),
  }),
  metadata: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  }),
});

// Schema for the final wrapped API response
const analyticsSummaryResponseSchema = wrapResponseSchema(
  analyticsSummarySuccessSchema,
);

// --- Route Handler ---

export const analyticsSummaryHandler = transactionsRoutesFactory.createHandlers(
  zValidator("json", analyticsSummaryRequestSchema),
  describeRoute({
    summary: "Transaction Analytics Summary",
    description:
      "Get a summary (total count and total gas calculation) for transactions within a time range, supporting complex nested filters.",
    tags: ["Transactions"],
    operationId: "getTransactionAnalyticsSummary",
    responses: {
      200: {
        description: "Transaction Analytics Summary",
        content: {
          "application/json": {
            schema: resolver(analyticsSummaryResponseSchema),
          },
        },
      },
      400: {
        description:
          "Bad Request (e.g., invalid date format, filter depth exceeded)",
      },
      500: {
        description: "Internal Server Error (e.g., database error)",
      },
    },
  }),
  async (c) => {
    const params = c.req.valid("json");

    // Parse dates
    const startDate = params.startDate ? new Date(params.startDate) : undefined;
    const endDate = params.endDate ? new Date(params.endDate) : undefined;

    // --- Build Filters ---
    let filtersClause: SQL | undefined;
    try {
      if (params.filters && params.filters.length > 0) {
        // Use buildAdvancedFilters which handles nesting
        filtersClause = buildAdvancedFilters(
          params.filters,
          params.filtersOperation,
          // You can optionally pass maxDepth here if needed, otherwise it uses default
        );
      }
    } catch (error: any) {
      // Handle potential maxDepth error from buildAdvancedFilters
      // Assuming buildAdvancedFilters throws a standard Error
      throw engineErrToHttpException({
        kind: "validation",
        code: "filter_error",
        status: 400,
        message: error.message || "Failed to build filters.",
      });
    }

    // Combine time range and advanced filters
    const whereConditions = [
      startDate ? gte(transactions.createdAt, startDate) : undefined,
      endDate ? lte(transactions.createdAt, endDate) : undefined,
      filtersClause, // Add the potentially complex filter clause
    ].filter((condition): condition is SQL => condition !== undefined); // Type guard and filter out undefined

    const finalWhereClause =
      whereConditions.length > 0 ? and(...whereConditions) : undefined;

    // --- Database Query ---
    // Sum of actualGasCost (wei)
    const totalGasCostWeiSql = sql<string>`SUM(
          COALESCE(CAST(${transactions.executionResult}->>'actualGasCost' AS numeric), 0)
        )`;

    // ADDED: Sum of actualGasUsed (units)
    const totalGasUnitsUsedSql = sql<string>`SUM(
          COALESCE(CAST(${transactions.executionResult}->>'actualGasUsed' AS numeric), 0)
        )`;

    const summaryResult = await ResultAsync.fromPromise(
      db
        .select({
          totalCount: count(),
          totalGasCostWei: totalGasCostWeiSql,
          // ADDED: Select the total gas units
          totalGasUnitsUsed: totalGasUnitsUsedSql,
        })
        .from(transactions)
        .where(finalWhereClause)
        .then((rows) => rows[0]),
      mapDbError,
    );

    if (summaryResult.isErr()) {
      throw engineErrToHttpException(summaryResult.error);
    }

    const summaryData = summaryResult.value;

    // Handle nulls/undefined from SUM if no rows match
    const totalGasCostWeiString = summaryData?.totalGasCostWei ?? "0";
    // ADDED: Handle null/undefined for gas units
    const totalGasUnitsUsedString = summaryData?.totalGasUnitsUsed ?? "0";
    const totalCount = summaryData?.totalCount ?? 0;

    // --- Format Response ---
    const responseMetadata: { startDate?: string; endDate?: string } = {};
    if (startDate) {
      responseMetadata.startDate = startDate.toISOString();
    }
    if (endDate) {
      responseMetadata.endDate = endDate.toISOString();
    }

    return c.json({
      result: {
        summary: {
          totalCount: totalCount,
          totalGasCostWei: totalGasCostWeiString,
          // ADDED: Include total gas units in the response
          totalGasUnitsUsed: totalGasUnitsUsedString,
        },
        metadata: responseMetadata,
      },
    });
  },
);
