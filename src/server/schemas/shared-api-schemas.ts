import type { ZodSchema } from "zod";
import * as z from "zod";

export function wrapResponseSchema(schema: ZodSchema) {
  return z.object({
    result: schema,
  });
}

export function wrapPaginatedResponseSchema(schema: ZodSchema) {
  return z.object({
    result: z.array(schema),
    pagination: z.object({
      totalCount: z.number(),
      page: z.number(),
      limit: z.number(),
    }),
  });
}

export const requestPaginationSchema = z.object({
  page: z.coerce.number().optional().default(1),
  limit: z.coerce.number().optional().default(100),
});
