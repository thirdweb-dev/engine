import { Type } from "@sinclair/typebox";

export const MarketplaceFilterSchema = Type.Object({
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
