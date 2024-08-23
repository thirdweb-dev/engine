import { Type } from "@sinclair/typebox";
import { AddressSchema } from "../address";

const NFTInputSchema = Type.Object({
  name: Type.Optional(
    Type.String({
      description: "Name of the item.",
    }),
  ),
  description: Type.Optional(
    Type.String({ description: "A human-readable description of the item." }),
  ),
  image: Type.Optional(
    Type.String({
      description: "This is the URL to the image of the item.",
    }),
  ),
  animation_url: Type.Optional(
    Type.String({
      description: "A URL to a multi-media attachment for the item.",
    }),
  ),
  external_url: Type.Optional(
    Type.String({
      description: "A URL that links to your app or platform.",
    }),
  ),
  background_color: Type.Optional(
    Type.String({
      description:
        "Background color of the item. Must be a six-character hexadecimal without a pre-pended #.",
    }),
  ),
  attributes: Type.Optional(
    Type.Array(
      Type.Object({
        trait_type: Type.String(),
        value: Type.String(),
      }),
      { description: "Arbitrary metadata for this item." },
    ),
  ),
});

/**
 * ERC721
 */
export const signature721InputSchemaV5 = Type.Object({
  metadata: Type.Union([Type.String(), NFTInputSchema]),
  to: {
    ...AddressSchema,
    description:
      "The wallet address that can use this signature to mint tokens. This is to prevent another wallet from intercepting the signature and using it to mint tokens for themselves.",
  },
  price: Type.Optional(
    Type.String({
      description:
        'The amount of the "currency" token this token costs. Example: "0.1".',
    }),
  ),
  priceInWei: Type.Optional(
    Type.String({
      description:
        'The amount of the "currency" token this token costs in wei. Example: "100000000000000000".',
    }),
  ),
  currency: Type.Optional({
    ...AddressSchema,
    description:
      "The currency address to pay for minting the tokens. Defaults to the chain's native token.",
  }),
  primarySaleRecipient: Type.Optional({
    ...AddressSchema,
    description:
      'If a price is specified, funds will be sent to the "primarySaleRecipient" address. Defaults to the "primarySaleRecipient" address of the contract.',
  }),
  royaltyRecipient: Type.Optional({
    ...AddressSchema,
    description:
      'The address that will receive the royalty fees from secondary sales. Defaults to the "royaltyRecipient" address of the contract.',
  }),
  royaltyBps: Type.Optional(
    Type.Integer({
      description:
        'The percentage fee you want to charge for secondary sales. Defaults to the "royaltyBps" of the contract.',
    }),
  ),
  validityStartTimestamp: Type.Optional(
    Type.Integer({
      description:
        "The start time (in Unix seconds) when the signature can be used to mint. Default: now",
    }),
  ),
  validityEndTimestamp: Type.Optional(
    Type.Integer({
      description:
        "The end time (in Unix seconds) when the signature can be used to mint. Default: 10 years",
    }),
  ),
  uid: Type.Optional(
    Type.String({
      description:
        "The uid is a unique identifier hashed in the payload to prevent replay attacks, ensuring it's only used once on-chain.",
    }),
  ),
});

export const signature721OutputSchemaV5 = Type.Object({
  uri: Type.String(),
  to: Type.String(),
  price: Type.String(),
  currency: AddressSchema,
  primarySaleRecipient: Type.String(),
  royaltyRecipient: Type.String(),
  royaltyBps: Type.String(),
  validityStartTimestamp: Type.String(),
  validityEndTimestamp: Type.String(),
  uid: Type.String(),
});
