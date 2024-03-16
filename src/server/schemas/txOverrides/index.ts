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
    Type.String({
      examples: [
        "my-product-sku",
        '{"sku":"abc123","userId":"6623c9e7-7d83-41a4-945a-652c7f6243ed"}',
        "0xd45b6f6bbb5289472696c3ba7e781c8efd5d3a413637834bc6539ac22e255af2",
      ],
      description:
        "Metadata that will be returned in a webhook. To pass multiple fields, serialize or encrypt your metadata object.",
    }),
  ),
});
