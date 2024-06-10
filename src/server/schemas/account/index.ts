import { Type } from "@sinclair/typebox";

export const sessionSchema = Type.Object({
  signerAddress: Type.String(),
  startDate: Type.String(),
  expirationDate: Type.String(),
  nativeTokenLimitPerTransaction: Type.String(),
  approvedCallTargets: Type.Array(Type.String()),
});
