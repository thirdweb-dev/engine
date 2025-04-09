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
  operation?: FilterOperation;
};

/**
 * Builds advanced SQL filters from filter objects
 *
 * @param filters - Array of filter objects
 * @param outerOperation - Operation to use when combining field conditions (AND/OR)
 * @returns SQL condition or undefined if no valid filters
 */
function buildAdvancedFilters(
  filters: FilterValue[],
  outerOperation: FilterOperation = "AND",
): SQL | undefined {
  if (!filters || filters.length === 0) return undefined;

  // Group filters by field
  const filtersByField: Record<FilterField, FilterValue[]> = {
    id: [],
    batchIndex: [],
    from: [],
    chainId: [],
    signerAddress: [],
    smartAccountAddress: [],
  };

  for (const filter of filters) {
    filtersByField[filter.field].push(filter);
  }

  // Process each field's filters
  const fieldConditions: SQL[] = [];

  // Process each field group
  for (const [field, fieldFilters] of Object.entries(filtersByField) as [
    FilterField,
    FilterValue[],
  ][]) {
    if (fieldFilters.length === 0) continue;

    const fieldConditionGroups: SQL[] = [];

    // Process each filter within the field group
    for (const filter of fieldFilters) {
      if (!filter.values || filter.values.length === 0) continue;

      const operation = filter.operation || "OR"; // Default to OR for values within a filter
      const conditions: SQL[] = [];

      for (const value of filter.values) {
        switch (field) {
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
        const conditionGroup =
          operation === "OR" ? or(...conditions) : and(...conditions);
        conditionGroup && fieldConditionGroups.push(conditionGroup);
      }
    }

    // Combine all filters for this field with AND (all filter groups for a field must match)
    if (fieldConditionGroups.length > 0) {
      const conditions = and(...fieldConditionGroups);
      conditions && fieldConditions.push(conditions);
    }
  }

  // Combine all field conditions with the outer operation
  if (fieldConditions.length > 0) {
    return outerOperation === "OR"
      ? or(...fieldConditions)
      : and(...fieldConditions);
  }

  return undefined;
}

// Export Zod schemas for validation
export const filterOperationSchema = z.enum(["AND", "OR"]).default("AND");

export const filterValueSchema = z.object({
  field: z.enum([
    "id",
    "batchIndex",
    "from",
    "signerAddress",
    "smartAccountAddress",
    "chainId",
  ]),
  values: z.array(z.string()),
  operation: filterOperationSchema.optional().default("OR"),
});

export const searchFiltersSchema = z.object({
  filters: z.array(filterValueSchema).optional(),
  filtersOperation: filterOperationSchema.optional().default("AND"),
});

export { buildAdvancedFilters };
