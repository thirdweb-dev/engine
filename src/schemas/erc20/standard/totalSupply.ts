import { Static, Type } from "@sinclair/typebox";
import {
  contractSchemaTypes,
  baseReplyErrorSchema,
} from "../../../sharedApiSchemas";

export const totalSupplyReplyBodySchema = Type.Object({
  result: Type.Optional(
    Type.Object({
      data: Type.Object({
        name: Type.String(),
        symbol: Type.String(),
        decimals: Type.String(),
        value: Type.String(),
        displayValue: Type.String(),
      }),
    }),
  ),
  error: Type.Optional(baseReplyErrorSchema),
});

export interface totalSupplyRouteSchema extends contractSchemaTypes {
  Reply: Static<typeof totalSupplyReplyBodySchema>;
}
