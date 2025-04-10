import { type SQL, and, eq, or, sql } from "drizzle-orm";
import { z } from "zod";
import { transactions } from "../../../db/schema.js";
import { getAddress } from "thirdweb";

// Define filter operation type
type FilterOperation = "AND" | "OR";

// Define the supported filter fields
type FilterField =
  | "id"
  | "batchIndex"
  | "from"
  | "signerAddress"
  | "smartAccountAddress"
  | "chainId";

// Define filter value type
type FilterValue = {
  field: FilterField;
  values: string[];
  operation: FilterOperation;
};

// Nested filter structure for combining multiple filters
type FilterNested = {
  operation: FilterOperation;
  filters: (FilterNested | FilterValue)[];
};

// Type to represent a filter item which can be either a value filter or a nested filter
type FilterItem = FilterValue | FilterNested;

/**
 * Helper function to check if a filter item is a nested filter
 */
function isNestedFilter(filter: FilterItem): filter is FilterNested {
  return "operation" in filter && "filters" in filter;
}

/**
 * Builds SQL filter conditions from a filter value
 *
 * @param filter - The filter value to process
 * @returns SQL condition or undefined if invalid
 */
function buildValueFilter(filter: FilterValue): SQL | undefined {
  if (!filter.values || filter.values.length === 0) return undefined;

  const operation = filter.operation || "OR"; // Default to OR for values within a filter
  const conditions: SQL[] = [];

  for (const value of filter.values) {
    switch (filter.field) {
      case "id":
        conditions.push(eq(transactions.id, value));
        break;
      case "batchIndex": {
        const batchIndex = Number.parseInt(value, 10);
        if (!Number.isNaN(batchIndex)) {
          conditions.push(eq(transactions.batchIndex, batchIndex));
        }
        break;
      }
      case "from":
        // TODO: use getAddressResult, and neverthrow-ify this function
        conditions.push(eq(transactions.from, getAddress(value)));
        break;
      case "chainId":
        conditions.push(eq(transactions.chainId, value));
        break;
      case "signerAddress":
        conditions.push(
          sql`${transactions.executionParams}->>'signerAddress' = ${getAddress(value)}`,
        );
        break;
      case "smartAccountAddress":
        conditions.push(
          sql`${transactions.executionParams}->>'smartAccountAddress' = ${getAddress(value)}`,
        );
        break;
    }
  }

  if (conditions.length > 0) {
    return operation === "OR" ? or(...conditions) : and(...conditions);
  }

  return undefined;
}

/**
 * Builds advanced SQL filters from filter objects, supporting nested filter structures
 *
 * @param filters - Array of filter items (value or nested)
 * @param outerOperation - Operation to use when combining conditions (AND/OR)
 * @param maxDepth - Maximum allowed nesting depth
 * @param currentDepth - Current nesting depth (for internal use)
 * @returns SQL condition or undefined if no valid filters
 * @throws Error if nesting depth exceeds maxDepth
 */
function buildAdvancedFilters(
  filters: FilterItem[],
  outerOperation: FilterOperation = "AND",
  maxDepth = 5,
  currentDepth = 0,
): SQL | undefined {
  if (currentDepth > maxDepth) {
    throw new Error(`Maximum filter nesting depth of ${maxDepth} exceeded`);
  }

  if (!filters || filters.length === 0) return undefined;

  const filterConditions: SQL[] = [];

  // Process value filters
  const valueFilters = filters.filter(
    (filter): filter is FilterValue => !isNestedFilter(filter),
  );

  if (valueFilters.length > 0) {
    if (currentDepth === 0) {
      // Group by field at top level (existing behavior)
      const filtersByField: Record<FilterField, FilterValue[]> = {
        id: [],
        batchIndex: [],
        from: [],
        chainId: [],
        signerAddress: [],
        smartAccountAddress: [],
      };

      for (const filter of valueFilters) {
        filtersByField[filter.field].push(filter);
      }

      for (const [_field, fieldFilters] of Object.entries(filtersByField) as [
        FilterField,
        FilterValue[],
      ][]) {
        if (fieldFilters.length === 0) continue;

        const fieldConditionGroups: SQL[] = [];
        for (const filter of fieldFilters) {
          const condition = buildValueFilter(filter);
          if (condition) {
            fieldConditionGroups.push(condition);
          }
        }
        // Use AND for top-level grouping (or outerOperation if desired)
        if (fieldConditionGroups.length > 0) {
          const condition = and(...fieldConditionGroups);
          if (condition) filterConditions.push(condition);
        }
      }
    } else {
      // Within a nested group, preserve order and use the nested outerOperation
      for (const filter of valueFilters) {
        const condition = buildValueFilter(filter);
        if (condition) filterConditions.push(condition);
      }
    }
  }

  // Process nested filters recursively
  const nestedFilters = filters.filter(isNestedFilter);
  for (const nestedFilter of nestedFilters) {
    const nestedCondition = buildAdvancedFilters(
      nestedFilter.filters,
      nestedFilter.operation,
      maxDepth,
      currentDepth + 1,
    );
    if (nestedCondition) {
      filterConditions.push(nestedCondition);
    }
  }

  if (filterConditions.length > 0) {
    return outerOperation === "OR"
      ? or(...filterConditions)
      : and(...filterConditions);
  }

  return undefined;
}

// Export Zod schemas for validation
export const filterOperationSchema = z.enum(["AND", "OR"]);

export const filterValueSchema = z
  .object({
    field: z.enum([
      "id",
      "batchIndex",
      "from",
      "signerAddress",
      "smartAccountAddress",
      "chainId",
    ]),
    values: z.array(z.string()),
    operation: filterOperationSchema,
  })
  .openapi({
    ref: "TransactionsFilterValue",
  });

// Define schema for nested filters with recursive type
export const filterNestedSchema: z.ZodType<FilterNested> = z
  .lazy(() =>
    z.object({
      operation: filterOperationSchema,
      filters: z.array(z.union([filterValueSchema, filterNestedSchema])),
    }),
  )
  .openapi({
    ref: "TransactionsFilterNested",
  });

// Combined schema for filter items
export const filterItemSchema: z.ZodType<FilterItem> = z.union([
  filterValueSchema,
  filterNestedSchema,
]);

export const searchFiltersSchema = z.object({
  filters: z.array(filterItemSchema).optional(),
  filtersOperation: filterOperationSchema.optional().default("AND"),
  maxDepth: z.number().int().positive().default(5),
});

export { buildAdvancedFilters };
