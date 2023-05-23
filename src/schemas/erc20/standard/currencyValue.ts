import { Type } from "@sinclair/typebox";

export const currencyValueSchema = Type.Object({
  name: Type.String(),
  symbol: Type.String(),
  decimals: Type.String(),
  value: Type.String({
    description: "Value in wei",
  }),
  displayValue: Type.String({
    description: "Value in tokens",
  }),
});
