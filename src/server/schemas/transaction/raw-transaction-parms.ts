import { Type } from "@sinclair/typebox";
import { AddressSchema, HexSchema } from "../address";
import { WeiAmountStringSchema } from "../number";

export const RawTransactionParamsSchema = Type.Object({
  toAddress: Type.Optional(AddressSchema),
  data: HexSchema,
  value: WeiAmountStringSchema,
});
