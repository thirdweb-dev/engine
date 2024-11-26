import type { Keypairs } from "@prisma/client";
import { type Static, Type } from "@sinclair/typebox";

// https://github.com/auth0/node-jsonwebtoken#algorithms-supported
const _supportedAlgorithms = [
  // Symmetric algorithms are disabled to avoid storing keys in plaintext.
  // "HS256",
  // "HS384",
  // "HS512",
  "RS256",
  "RS384",
  "RS512",
  "ES256",
  "ES384",
  "ES512",
  "PS256",
  "PS384",
  "PS512",
] as const;

export type KeypairAlgorithm = (typeof _supportedAlgorithms)[number];

export const KeypairAlgorithmSchema = Type.Union(
  _supportedAlgorithms.map((alg) => Type.Literal(alg)),
);

export const KeypairSchema = Type.Object({
  hash: Type.String({
    description: "A unique identifier for the keypair",
  }),
  publicKey: Type.String({
    description: "The public key",
  }),
  algorithm: Type.String({
    description: "The keypair algorithm.",
  }),
  label: Type.Optional(
    Type.String({
      description: "A description for the keypair.",
    }),
  ),
  createdAt: Type.Unsafe<Date>({
    type: "string",
    format: "date",
    description: "When the keypair was added",
  }),
  updatedAt: Type.Unsafe<Date>({
    type: "string",
    format: "date",
    description: "When the keypair was updated",
  }),
});

export const toKeypairSchema = (
  keypair: Keypairs,
): Static<typeof KeypairSchema> => ({
  hash: keypair.hash,
  publicKey: keypair.publicKey,
  algorithm: keypair.algorithm,
  label: keypair.label ?? undefined,
  createdAt: keypair.createdAt,
  updatedAt: keypair.updatedAt,
});
