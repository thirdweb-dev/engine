import { Type } from "@sinclair/typebox";

export const TokenAmountStringSchema = Type.RegExp(/^\d+(\.\d+)?$/, {
  description: 'An amount in native token (decimals allowed). Example: "1.5"',
  examples: ["0.1"],
});

export const WeiAmountStringSchema = Type.RegExp(/^\d+$/, {
  description: 'An amount in wei (no decimals). Example: "100000000"',
  examples: ["100000000000000000"],
});
