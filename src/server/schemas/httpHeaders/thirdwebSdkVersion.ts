import { Type } from "@sinclair/typebox";

export const thirdwebSdkVersionSchema = Type.Object({
  "x-thirdweb-sdk-version": Type.Optional(
    Type.String({
      description: "Override the thirdweb sdk version used.",
      examples: ["5"],
    }),
  ),
});
