import { Type } from "@sinclair/typebox";

export const txOverridesForWriteRequest = Type.Object({
  txOverrides: Type.Optional(
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
