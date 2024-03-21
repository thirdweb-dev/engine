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
  idempotencyKey: Type.Optional(
    Type.String({
      description:
        "A string that uniquely identifies this transaction. Submitting the same idempotency key will not enqueue a new transaction for 24 hours.",
      examples: ["your-app-internal-id"],
    }),
  ),
});
