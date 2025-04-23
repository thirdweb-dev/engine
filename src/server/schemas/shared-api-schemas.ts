import type { ZodSchema } from "zod";
import * as z from "zod";
import type { ExecutionCredentials } from "../../executors/execute/execute";

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

export const executionCredentialsHeadersSchema = z.object({
  "x-vault-access-token": z.string().optional().openapi({
    description: "Vault Access Token used to access your EOA",
  }),
});

type ExecutionCredentialsHeaders = z.infer<
  typeof executionCredentialsHeadersSchema
>;

export function credentialsFromHeaders(headers: ExecutionCredentialsHeaders) {
  return {
    vaultAccessToken: headers["x-vault-access-token"],
  } as ExecutionCredentials;
}
