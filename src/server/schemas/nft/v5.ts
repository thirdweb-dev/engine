import { Type } from "@sinclair/typebox";
import { nftInputSchema } from "./index.js";
import { AddressSchema } from "../address.js";

/**
 * ERC721
 */
export const signature721InputSchemaV5 = Type.Object({
  metadata: Type.Union([Type.String(), nftInputSchema]),
  to: {
    ...AddressSchema,
    description:
      "The wallet address that can use this signature to mint tokens. This is to prevent another wallet from intercepting the signature and using it to mint tokens for themselves.",
  },
  price: Type.Optional(
    Type.String({
      description:
        'The amount of the "currency" token this token costs. Example: "0.1"',
    }),
  ),
  priceInWei: Type.Optional(
    Type.String({
      description:
        'The amount of the "currency" token this token costs in wei. Remember to use the correct decimals amount for the currency. Example: "100000000000000000" = 0.1 ETH (18 decimals)',
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
      minimum: 0,
      maximum: 10_000,
    }),
  ),
  validityStartTimestamp: Type.Optional(
    Type.Integer({
      description:
        "The start time (in Unix seconds) when the signature can be used to mint. Default: now",
      minimum: 0,
    }),
  ),
  validityEndTimestamp: Type.Optional(
    Type.Integer({
      description:
        "The end time (in Unix seconds) when the signature can be used to mint. Default: 10 years",
      minimum: 0,
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
  validityStartTimestamp: Type.Integer(),
  validityEndTimestamp: Type.Integer(),
  uid: Type.String(),
});
