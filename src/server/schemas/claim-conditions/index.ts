import { Type } from "@sinclair/typebox";
import { AddressSchema } from "../address.js";
import { currencyValueSchema } from "../shared-api-schemas.js";

export const claimConditionInputSchema = Type.Object({
  maxClaimableSupply: Type.Optional(
    Type.Union([Type.String(), Type.Integer({ minimum: 0 })]),
  ),
  startTime: Type.Optional(
    Type.Union([
      Type.String({
        format: "date-time",
      }),
      Type.Integer({ minimum: 0 }),
    ]),
  ),
  price: Type.Optional(Type.Union([Type.Number(), Type.String()])),
  currencyAddress: Type.Optional(AddressSchema),
  maxClaimablePerWallet: Type.Optional(
    Type.Union([Type.Integer({ minimum: 0 }), Type.String()]),
  ),
  waitInSeconds: Type.Optional(
    Type.Union([Type.Integer({ minimum: 0 }), Type.String()]),
  ),
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
          currencyAddress: Type.Optional(AddressSchema),
          address: AddressSchema,
          maxClaimable: Type.Optional(
            Type.Union([Type.String(), Type.Integer({ minimum: 0 })]),
          ),
        }),
      ),
      Type.Null(),
    ]),
  ),
});

export const sanitizedClaimConditionInputSchema = Type.Object({
  ...claimConditionInputSchema.properties,
  startTime: Type.Optional(
    Type.Union([Type.Date(), Type.Integer({ minimum: 0 })]),
  ),
});

export const claimConditionOutputSchema = Type.Object({
  maxClaimableSupply: Type.Optional(
    Type.Union([Type.String(), Type.Integer({ minimum: 0 })]),
  ),
  startTime: Type.String({
    format: "date-time",
  }),
  price: Type.Optional(Type.Union([Type.Number(), Type.String()])),
  currencyAddress: Type.Optional(AddressSchema),
  maxClaimablePerWallet: Type.Optional(
    Type.Union([Type.Integer({ minimum: 0 }), Type.String()]),
  ),
  waitInSeconds: Type.Optional(
    Type.Union([Type.Integer({ minimum: 0 }), Type.String()]),
  ),
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
          currencyAddress: Type.Optional(AddressSchema),
          address: AddressSchema,
          maxClaimable: Type.Optional(
            Type.Union([Type.String(), Type.Integer({ minimum: 0 })]),
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
    currencyAddress: Type.Optional(AddressSchema),
    address: AddressSchema,
    maxClaimable: Type.String(),
    proof: Type.Array(Type.String()),
  }),
]);

export const setBatchSantiziedClaimConditionsRequestSchema = Type.Object({
  claimConditionsForToken: Type.Array(
    Type.Object({
      tokenId: Type.Union([Type.String(), Type.Integer()], {
        description: "ID of the token to set the claim conditions for",
      }),
      claimConditions: Type.Array(sanitizedClaimConditionInputSchema),
    }),
  ),
  resetClaimEligibilityForAll: Type.Optional(Type.Boolean()),
});
