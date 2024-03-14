import { Type } from "@sinclair/typebox";
import { nftMetadataSchema } from "../../nft";
import { currencyValueSchema, Status } from "../../sharedApiSchemas";

export const directListingV3InputSchema = Type.Object({
  assetContractAddress: Type.String({
    description: "The address of the asset being listed.",
  }),
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
});

export const directListingV3OutputSchema = Type.Object({
  assetContractAddress: Type.String({
    description: "The address of the asset being listed.",
  }),
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
});
