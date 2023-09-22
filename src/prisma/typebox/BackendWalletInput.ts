import { Type, Static } from "@sinclair/typebox";

export const BackendWalletInput = Type.Object({
  address: Type.String(),
  type: Type.String(),
  awsKmsKeyId: Type.Optional(Type.String()),
  awsKmsArn: Type.Optional(Type.String()),
  gcpKmsKeyRingId: Type.Optional(Type.String()),
  gcpKmsKeyId: Type.Optional(Type.String()),
  gcpKmsKeyVersionId: Type.Optional(Type.String()),
  gcpKmsLocationId: Type.Optional(Type.String()),
  gcpKmsResourcePath: Type.Optional(Type.String()),
});

export type BackendWalletInputType = Static<typeof BackendWalletInput>;
