import { Type } from "@sinclair/typebox";
import { AddressSchema } from "../../address.js";
import { nftMetadataSchema } from "../../nft/index.js";
import { Status } from "../../shared-api-schemas.js";

const currencyValueSchema = Type.Object({
  name: Type.Optional(Type.String()),
  symbol: Type.Optional(Type.String()),
  decimals: Type.Optional(Type.Integer({ minimum: 1 })),
  value: Type.Optional(Type.String()),
  displayValue: Type.Optional(Type.String()),
});

currencyValueSchema.description =
  "The `CurrencyValue` of the listing. Useful for displaying the price information.";

export const englishAuctionInputSchema = Type.Object({
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
  buyoutBidAmount: Type.String({
    description: "amount to buy the NFT and close the listing.",
  }),
  minimumBidAmount: Type.String({
    description: "Minimum amount that bids must be to placed",
  }),
  bidBufferBps: Type.Optional(
    Type.String({
      description:
        "percentage the next bid must be higher than the current highest bid (default is contract-level bid buffer bps)",
    }),
  ),
  timeBufferInSeconds: Type.Optional(
    Type.String({
      description:
        "time in seconds that are added to the end time when a bid is placed (default is contract-level time buffer in seconds)",
    }),
  ),
});

export const englishAuctionOutputSchema = Type.Object({
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
    description: "The listing ID.",
  }),
  minimumBidAmount: Type.Optional(
    Type.String({
      description:
        "The minimum price that a bid must be in order to be accepted.",
    }),
  ),
  buyoutBidAmount: Type.String({
    description: "The buyout price of the auction.",
  }),
  buyoutCurrencyValue: currencyValueSchema,
  timeBufferInSeconds: Type.Number({
    description: "This is a buffer e.g. x seconds.",
  }),
  bidBufferBps: Type.Integer({
    description:
      "To be considered as a new winning bid, a bid must be at least x% greater than the previous bid.",
    minimum: 0,
    maximum: 10_000,
  }),
  startTimeInSeconds: Type.Integer({
    description: "The start time of the auction.",
    minimum: 0,
  }),
  endTimeInSeconds: Type.Integer({
    description: "The end time of the auction.",
    minimum: 0,
  }),
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
});

export const bidSchema = Type.Object({
  auctionId: Type.Optional(
    Type.String({
      description: "The id of the auction.",
    }),
  ),
  bidderAddress: Type.Optional(
    Type.String({
      description: "The address of the buyer who made the offer.",
    }),
  ),
  currencyContractAddress: Type.Optional(
    Type.String({
      description: "The currency contract address of the offer token.",
    }),
  ),
  bidAmount: Type.Optional(
    Type.String({
      description: "The amount of coins offered per token.",
    }),
  ),
  bidAmountCurrencyValue: Type.Optional(currencyValueSchema),
});
