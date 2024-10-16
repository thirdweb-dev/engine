import { Type } from "@sinclair/typebox";

export const TokenAmountStringSchema = Type.RegExp(/^\d+(\.\d+)?$/, {
  description: 'An amount in native token (decimals allowed). Example: "0.1"',
  examples: ["0.1"],
});

export const WeiAmountStringSchema = Type.RegExp(/^\d+$/, {
  description: 'An amount in wei (no decimals). Example: "50000000000"',
  examples: ["50000000000"],
});

export const NumberStringSchema = Type.RegExp(/^\d+$/, {
  examples: ["42"],
});
