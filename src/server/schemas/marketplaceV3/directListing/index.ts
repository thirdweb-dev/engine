import { Type } from "@sinclair/typebox";
import { AddressSchema } from "../../address";
import { nftMetadataSchema } from "../../nft";
import { Status, currencyValueSchema } from "../../sharedApiSchemas";

export const directListingV3InputSchema = Type.Object({
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
  pricePerToken: Type.String({
    description: "The price to pay per unit of NFTs listed.",
  }),
  isReservedListing: Type.Optional(
    Type.Boolean({
      description:
        "Whether the listing is reserved to be bought from a specific set of buyers.",
    }),
  ),
  startTimestamp: Type.Optional(
    Type.Integer({
      description:
        "The start time of the listing. If not set, defaults to now.",
      minimum: 0,
    }),
  ),
  endTimestamp: Type.Optional(
    Type.Integer({
      description:
        "The end time of the listing. If not set, defaults to 7 days from now.",
      minimum: 0,
    }),
  ),
});

export const directListingV3OutputSchema = Type.Object({
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
  pricePerToken: Type.String({
    description: "The price to pay per unit of NFTs listed.",
  }),
  isReservedListing: Type.Optional(
    Type.Boolean({
      description:
        "Whether the listing is reserved to be bought from a specific set of buyers.",
    }),
  ),
  id: Type.String({
    description: "The listing ID.",
  }),
  currencyValuePerToken: Type.Optional(currencyValueSchema),
  asset: Type.Optional(nftMetadataSchema),
  status: Type.Optional(
    Type.Union([
      Type.Literal(Status.UNSET, { description: "UNSET" }),
      Type.Literal(Status.Created, { description: "Created" }),
      Type.Literal(Status.Completed, { description: "Completed" }),
      Type.Literal(Status.Cancelled, { description: "Cancelled" }),
      Type.Literal(Status.Active, { description: "Active" }),
      Type.Literal(Status.Expired, { description: "Expired" }),
    ]),
  ),
  startTimeInSeconds: Type.Optional(
    Type.Integer({
      description:
        "The start time of the listing. If not set, defaults to now.",
      minimum: 0,
    }),
  ),
  endTimeInSeconds: Type.Optional(
    Type.Integer({
      description:
        "The end time of the listing. If not set, defaults to 7 days from now.",
      minimum: 0,
    }),
  ),
});
