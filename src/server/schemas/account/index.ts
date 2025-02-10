import { Type } from "@sinclair/typebox";
import { AddressSchema } from "../address.js";

export const sessionSchema = Type.Object({
  signerAddress: AddressSchema,
  startDate: Type.String(),
  expirationDate: Type.String(),
  nativeTokenLimitPerTransaction: Type.String(),
  approvedCallTargets: Type.Array(Type.String()),
});
