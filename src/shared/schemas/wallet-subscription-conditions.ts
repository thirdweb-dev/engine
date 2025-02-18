import { Type } from "@sinclair/typebox";
import { z } from "zod";
import { AddressSchema } from "../../server/schemas/address";

// TypeBox schemas for API validation
export const WalletConditionSchema = Type.Union([
  Type.Object({
    type: Type.Literal('token_balance_lt'),
    tokenAddress: Type.Union([AddressSchema, Type.Literal('native')]),
    value: Type.String({
      description: "The threshold value in wei",
      examples: ["1000000000000000000"] // 1 ETH
    })
  }),
  Type.Object({
    type: Type.Literal('token_balance_gt'),
    tokenAddress: Type.Union([AddressSchema, Type.Literal('native')]),
    value: Type.String({
      description: "The threshold value in wei",
      examples: ["1000000000000000000"] // 1 ETH
    })
  })
]);

export const WalletConditionsSchema = Type.Array(WalletConditionSchema, {
  maxItems: 100,
  description: "Array of conditions to monitor for this wallet"
});

// Zod schemas for internal validation
export const WalletConditionZ = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('token_balance_lt'),
    tokenAddress: z.union([z.string(), z.literal('native')]),
    value: z.string()
  }),
  z.object({
    type: z.literal('token_balance_gt'),
    tokenAddress: z.union([z.string(), z.literal('native')]),
    value: z.string()
  })
]);

export const WalletConditionsZ = z.array(WalletConditionZ).max(100);

// Type exports
export type WalletCondition = z.infer<typeof WalletConditionZ>;
export type WalletConditions = z.infer<typeof WalletConditionsZ>;

// Helper to validate conditions
export function validateConditions(conditions: unknown): WalletConditions {
  return WalletConditionsZ.parse(conditions);
} 