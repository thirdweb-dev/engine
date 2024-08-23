import { Type } from "@sinclair/typebox";

export const claimConditionInputSchema = Type.Object({
  maxClaimableSupply: Type.Optional(Type.Union([Type.String(), Type.Number()])),
  startTime: Type.Optional(
    Type.Union([
      Type.String({
        format: "date-time",
      }),
      Type.Number(),
    ]),
  ),
  price: Type.Optional(Type.Union([Type.Number(), Type.String()])),
  currencyAddress: Type.Optional(Type.String()),
  maxClaimablePerWallet: Type.Optional(
    Type.Union([Type.Number(), Type.String()]),
  ),
  waitInSeconds: Type.Optional(Type.Union([Type.Number(), Type.String()])),
  merkleRootHash: Type.Optional(
    Type.Union([Type.String(), Type.Array(Type.Number())]),
  ),
  metadata: Type.Optional(
    Type.Object({
      name: Type.Optional(Type.String()),
    }),
  ),
  snapshot: Type.Optional(
    Type.Union([
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
      Type.Null(),
    ]),
  ),
});

export const sanitizedClaimConditionInputSchema = Type.Object({
  ...claimConditionInputSchema.properties,
  startTime: Type.Optional(Type.Union([Type.Date(), Type.Number()])),
});

export const claimConditionOutputSchema = Type.Object({
  maxClaimableSupply: Type.Optional(Type.Union([Type.String(), Type.Number()])),
  startTimestamp: Type.String(),
  pricePerToken: Type.Optional(Type.Union([Type.Number(), Type.String()])),
  currency: Type.Optional(Type.String()),
  quantityLimitPerWallet: Type.Optional(
    Type.Union([Type.Number(), Type.String()]),
  ),
  merkleRoot: Type.Union([Type.String(), Type.Array(Type.Number())]),
  supplyClaimed: Type.String(),
  metadata: Type.Optional(Type.String()),
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

export const setBatchSantiziedClaimConditionsRequestSchema = Type.Object({
  claimConditionsForToken: Type.Array(
    Type.Object({
      tokenId: Type.Union([Type.String(), Type.Number()], {
        description: "ID of the token to set the claim conditions for",
      }),
      claimConditions: Type.Array(sanitizedClaimConditionInputSchema),
    }),
  ),
  resetClaimEligibilityForAll: Type.Optional(Type.Boolean()),
});
