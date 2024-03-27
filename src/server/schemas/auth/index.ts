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
  hash: Type.String({
    description: "A unique identifier for the keypair",
  }),
  publicKey: Type.String({
    description: "An ES256 public key",
  }),
  createdAt: Type.Unsafe<Date>({
    type: "string",
    format: "date",
    description: "When the keypair was imported",
  }),
});
