import { Type } from "@sinclair/typebox";

export const txOverrides = Type.Object({
  txOverrides: Type.Optional(
    Type.Object({
      value: Type.Optional(
        Type.String({
          examples: ["0"],
          description: "Amount of native currency to send",
        }),
      ),
    }),
  ),
});
