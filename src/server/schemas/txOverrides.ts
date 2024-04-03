import { Type } from "@sinclair/typebox";

export const txOverrides = Type.Object({
  txOverrides: Type.Optional(
    Type.Object({
      value: Type.Optional(
        Type.String({
          examples: ["10000000000"],
          description: "Amount of native currency to send",
        }),
      ),
      gas: Type.Optional(
        Type.String({
          examples: ["530000"],
          description: "Gas limit for the transaction",
        }),
      ),
    }),
  ),
});
