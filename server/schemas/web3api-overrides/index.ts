import { Type } from "@sinclair/typebox";

export const txOverridesForWriteRequest = Type.Object({
  tx_overrides: Type.Optional(
    Type.Object({
      value: Type.Optional(
        Type.String({
          examples: ["0"],
          description: "Native Currency Value",
        }),
      ),
    }),
  ),
});
