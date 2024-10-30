import { Type } from "@sinclair/typebox";
import { AddressSchema } from "../../address";
import { nftMetadataSchema } from "../../nft";
import { Status, currencyValueSchema } from "../../sharedApiSchemas";

export const OfferV3InputSchema = Type.Object({
  assetContractAddress: {
    ...AddressSchema,
    description: "The address of the asset being listed.",
  },
  tokenId: Type.String({
    description: "The ID of the token to list.",
  }),
  currencyContractAddress: Type.Optional(
    Type.String({
      description: "The address of the currency to accept for the listing.",
    }),
  ),
  quantity: Type.Optional(
    Type.String({
      description:
        "The quantity of tokens to include in the listing. NOTE: For ERC721s, this value should always be 1 (and will be forced internally regardless of what is passed here).",
    }),
  ),
  totalPrice: Type.String({
    description: "the price to offer in the currency specified",
  }),
  endTimestamp: Type.Optional(
    Type.Integer({
      description: "Defaults to 10 years from now.",
      minimum: 0,
    }),
  ),
});

export const OfferV3OutputSchema = Type.Object({
  assetContractAddress: {
    ...AddressSchema,
    description: "The address of the asset being listed.",
  },
  tokenId: Type.String({
    description: "The ID of the token to list.",
  }),
  currencyContractAddress: Type.Optional(
    Type.String({
      description: "The address of the currency to accept for the listing.",
    }),
  ),
  quantity: Type.Optional(
    Type.String({
      description:
        "The quantity of tokens to include in the listing. NOTE: For ERC721s, this value should always be 1 (and will be forced internally regardless of what is passed here).",
    }),
  ),
  id: Type.String({
    description: "The id of the offer.",
  }),
  offerorAddress: {
    ...AddressSchema,
    description: "The address of the creator of offer.",
  },
  currencyValue: Type.Optional(currencyValueSchema),
  totalPrice: Type.String({
    description: "The total offer amount for the NFTs.",
  }),
  asset: Type.Optional(nftMetadataSchema),
  endTimeInSeconds: Type.Optional(
    Type.Integer({
      description: "The end time of the auction.",
      minimum: 0,
    }),
  ),
  status: Type.Optional(
    Type.Union([
      Type.Literal(Status.UNSET),
      Type.Literal(Status.Created),
      Type.Literal(Status.Completed),
      Type.Literal(Status.Cancelled),
      Type.Literal(Status.Active),
      Type.Literal(Status.Expired),
    ]),
  ),
});
