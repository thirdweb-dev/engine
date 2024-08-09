import { Type } from "@sinclair/typebox";

export const commonTxBodySchema = Type.Object({
  externalMetadata: Type.Optional(
    Type.String({
      description:
        "External metadata that is returned to webhook listeners. If used for JSON, we recommend base64 encoding a stringified JSON object.",
    }),
  ),
});
