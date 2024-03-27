import { Type } from "@sinclair/typebox";

export enum Permission {
  Owner = "OWNER",
  Admin = "ADMIN",
}

export const PermissionsSchema = Type.Union([
  Type.Literal(Permission.Admin),
  Type.Literal(Permission.Owner),
]);

export const KeypairSchema = Type.Object({
  publicKey: Type.String(),
  createdAt: Type.Date(),
});
