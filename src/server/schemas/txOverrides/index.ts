import { Type } from "@sinclair/typebox";

export const txOverridesForWriteRequest = Type.Object({
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
  customMetadata: Type.Optional(
    Type.Object(Type.String(), {
      examples: [
        { sku: "abc123", userId: "6623c9e7-7d83-41a4-945a-652c7f6243ed" },
      ],
      description:
        "Metadata that will be returned in a webhook. The value must be a string type.",
    }),
  ),
});
