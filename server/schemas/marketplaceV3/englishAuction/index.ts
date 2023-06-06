import { Type } from "@sinclair/typebox";
import { nftMetadataSchema } from "../../nft";
import { basicMarketPlaceInputSchema } from "../../../helpers/sharedApiSchemas";

export enum Status {
  UNSET = 0,
  Created = 1,
  Completed = 2,
  Cancelled = 3,
  Active = 4,
  Expired = 5,
}

const currencyValueSchema = Type.Object({
  name: Type.Optional(Type.String()),
  symbol: Type.Optional(Type.String()),
  decimals: Type.Optional(Type.Number()),
  value: Type.Optional(Type.String()),
  displayValue: Type.Optional(Type.String()),
});

currencyValueSchema.description =
  "The `CurrencyValue` of the listing. Useful for displaying the price information.";

export const englishAuctionInputSchema = Type.Intersect([
  basicMarketPlaceInputSchema,
  Type.Object({
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
  }),
]);

export const englishAuctionOutputSchema = Type.Intersect([
  basicMarketPlaceInputSchema,
  Type.Object({
    id: Type.String({
      description: "The id of the listing.",
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
    bidBufferBps: Type.Number({
      description:
        "To be considered as a new winning bid, a bid must be at least x% greater than the previous bid.",
    }),
    startTimeInSeconds: Type.Number({
      description: "The start time of the auction.",
    }),
    endTimeInSeconds: Type.Number({
      description: "The end time of the auction.",
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
  }),
]);

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
