import { Type } from "@sinclair/typebox";
import { nftMetadataSchema } from "../../nft";
import {
  basicMarketPlaceInputSchema,
  currencyValueSchema,
} from "../../../helpers/sharedApiSchemas";

export enum Status {
  UNSET = 0,
  Created = 1,
  Completed = 2,
  Cancelled = 3,
  Active = 4,
  Expired = 5,
}

export const directListingV3InputSchema = Type.Intersect([
  basicMarketPlaceInputSchema,
  Type.Object({
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
      Type.Number({
        description:
          "The start time of the listing. If not set, defaults to now.",
      }),
    ),
    endTimestamp: Type.Optional(
      Type.Number({
        description:
          "The end time of the listing. If not set, defaults to 7 days from now.",
      }),
    ),
  }),
]);

export const directListingV3OutputSchema = Type.Intersect([
  basicMarketPlaceInputSchema,
  Type.Object({
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
      description: "The id of the listing.",
    }),
    currencyValuePerToken: Type.Optional(currencyValueSchema),
    asset: Type.Optional(nftMetadataSchema),
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
    startTimeInSeconds: Type.Optional(
      Type.Number({
        description:
          "The start time of the listing. If not set, defaults to now.",
      }),
    ),
    endTimeInSeconds: Type.Optional(
      Type.Number({
        description:
          "The end time of the listing. If not set, defaults to 7 days from now.",
      }),
    ),
  }),
]);

export const getAllFilterSchema = Type.Object({
  count: Type.Optional(
    Type.Number({
      description: "Number of listings to fetch",
    }),
  ),
  offeror: Type.Optional(
    Type.String({
      description: "has offers from this Address",
    }),
  ),
  seller: Type.Optional(
    Type.String({
      description: "Being sold by this Address",
    }),
  ),
  start: Type.Optional(
    Type.Number({
      description: "Satrt from this index (pagination)",
    }),
  ),
  tokenContract: Type.Optional(
    Type.String({
      description: "Token contract address to show NFTs from",
    }),
  ),
  tokenId: Type.Optional(
    Type.String({
      description: "Only show NFTs with this ID",
    }),
  ),
});
