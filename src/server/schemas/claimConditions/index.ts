import { Type } from "@sinclair/typebox";
import { currencyValueSchema } from "../sharedApiSchemas";

export const claimConditionInputSchema = Type.Object({
  maxClaimableSupply: Type.Optional(Type.Union([Type.String(), Type.Number()])),
  startTime: Type.Optional(Type.Union([Type.Number(), Type.Date()])),
  price: Type.Optional(Type.Union([Type.Number(), Type.String()])),
  currencyAddress: Type.Optional(Type.String()),
  maxClaimablePerWallet: Type.Optional(
    Type.Union([Type.Number(), Type.String()]),
  ),
  waitInSeconds: Type.Optional(Type.Union([Type.Number(), Type.String()])),
  merkleRootHash: Type.Union([Type.String(), Type.Array(Type.Number())]),
  availableSupply: Type.String(),
  currentMintSupply: Type.String(),
  currencyMetadata: currencyValueSchema,
  metadata: Type.Optional(
    Type.Object({
      name: Type.Optional(Type.String()),
    }),
  ),
  snapshot: Type.Optional(
    Type.Union([
      Type.Null(),
      Type.Array(Type.String()),
      Type.Array(
        Type.Object({
          price: Type.Optional(Type.Union([Type.String(), Type.Number()])),
          currencyAddress: Type.Optional(Type.String()),
          address: Type.String(),
          maxClaimable: Type.Optional(
            Type.Union([Type.String(), Type.Number()]),
          ),
        }),
      ),
    ]),
  ),
});

export const claimerProofSchema = Type.Union([
  Type.Null(),
  Type.Object({
    price: Type.Optional(Type.String()),
    currencyAddress: Type.Optional(Type.String()),
    address: Type.String(),
    maxClaimable: Type.String(),
    proof: Type.Array(Type.String()),
  }),
]);
