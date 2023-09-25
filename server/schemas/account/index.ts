import { Type } from "@sinclair/typebox";

export const SessionSchema = Type.Object({
  signerAddress: Type.String(),
  startDate: Type.String(),
  expirationDate: Type.String(),
  nativeTokenLimitPerTransaction: Type.String(),
  approvedCallTargets: Type.Array(Type.String()),
});
