import { Type } from "@sinclair/typebox";
import { AddressSchema, HexSchema } from "../address.js";
import { WeiAmountStringSchema } from "../number.js";

export const RawTransactionParamsSchema = Type.Object({
  toAddress: Type.Optional(AddressSchema),
  data: HexSchema,
  value: WeiAmountStringSchema,
});
