import { Type } from "@sinclair/typebox";
import { z } from "zod";

// TypeBox schema for request validation
export const balanceSubscriptionConfigSchema = Type.Object({
  threshold: Type.Optional(
    Type.Object({
      min: Type.Optional(Type.String({
        description: "Minimum balance threshold",
        examples: ["1000000000000000000"], // 1 ETH in wei
      })),
      max: Type.Optional(Type.String({
        description: "Maximum balance threshold",
        examples: ["10000000000000000000"], // 10 ETH in wei
      })),
    }),
  ),
});

// Zod schema for response parsing
export const balanceSubscriptionConfigZodSchema = z.object({
  threshold: z.object({
    min: z.string().optional(),
    max: z.string().optional(),
  }).optional(),
});

export type BalanceSubscriptionConfig = z.infer<typeof balanceSubscriptionConfigZodSchema>;

// Helper to ensure config is properly typed when creating
export function parseBalanceSubscriptionConfig(config: unknown): BalanceSubscriptionConfig {
  return balanceSubscriptionConfigZodSchema.parse(config);
} 