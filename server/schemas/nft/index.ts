import { Type } from "@sinclair/typebox";

export const nftMetadataInputSchema = Type.Object({
  name: Type.Optional(Type.Union([Type.String(), Type.Number(), Type.Null()])),
  description: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  image: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  external_url: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  animation_url: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  properties: Type.Optional(Type.Union([Type.Any(), Type.Null()])),
  attributes: Type.Optional(Type.Union([Type.Any(), Type.Null()])),
});

export const nftMetadataSchema = Type.Object({
  id: Type.String(),
  uri: Type.String(),
  name: Type.Optional(Type.Union([Type.String(), Type.Number(), Type.Null()])),
  description: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  image: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  external_url: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  animation_url: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  properties: Type.Optional(Type.Union([Type.Any(), Type.Null()])),
  attributes: Type.Optional(Type.Union([Type.Any(), Type.Null()])),
});

export const nftOrInputSchema = Type.Union([
  nftMetadataInputSchema,
  Type.String(),
]);

export const nftAndSupplySchema = Type.Object({
  metadata: nftOrInputSchema,
  supply: Type.String(),
});

export const nftSchema = Type.Object({
  metadata: nftMetadataSchema,
  owner: Type.String(),
  type: Type.Union([
    Type.Literal("ERC1155"),
    Type.Literal("ERC721"),
    Type.Literal("metaplex"),
  ]),
  supply: Type.String(),
  quantityOwned: Type.Optional(Type.String()),
});
