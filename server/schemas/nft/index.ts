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

export const signature721InputSchema = Type.Object({
  to: Type.String({
    description:
      "The wallet address that can use this signature to mint tokens. This is to prevent another wallet from intercepting the signature and using it to mint tokens for themselves.",
  }),
  royaltyRecipient: Type.Optional(
    Type.String({
      description:
        "The address that will receive the royalty fees from secondary sales. Defaults to the royaltyRecipient address of the contract.",
    }),
  ),
  quantity: Type.Optional(
    Type.String({
      description: "The number of tokens this signature can be used to mint.",
    }),
  ),
  royaltyBps: Type.Optional(
    Type.Number({
      description:
        "The percentage fee you want to charge for secondary sales. Defaults to the royaltyBps of the contract.",
    }),
  ),
  primarySaleRecipient: Type.Optional(
    Type.String({
      description:
        "If a price is specified, the funds will be sent to the primarySaleRecipient address. Defaults to the primarySaleRecipient address of the contract.",
    }),
  ),
  uid: Type.Optional(
    Type.String({
      description: `A unique identifier for the payload, used to prevent replay attacks and other types of exploits.
      Note that the input value gets hashed in the actual payload that gets generated. 
      The smart contract enforces on-chain that no uid gets used more than once, 
      which means you can deterministically generate the uid to prevent specific exploits.`,
    }),
  ),
  metadata: Type.Union([nftMetadataInputSchema, Type.String()]),
  currencyAddress: Type.Optional(
    Type.String({
      description:
        "The address of the currency to pay for minting the tokens (use the price field to specify the price). Defaults to NATIVE_TOKEN_ADDRESS",
    }),
  ),
  price: Type.Optional(
    Type.String({
      description:
        "If you want the user to pay for minting the tokens, you can specify the price per token. Defaults to 0.",
      default: "0",
    }),
  ),
  mintStartTime: Type.Optional(
    Type.Number({
      description:
        "The time from which the signature can be used to mint tokens. Defaults to now.",
      default: Date.now(),
    }),
  ),
  mintEndTime: Type.Optional(
    Type.Number({
      description:
        "The time until which the signature can be used to mint tokens. Defaults to 10 years from now.",
      default: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365 * 10).getTime(),
    }),
  ),
});

export const signature721OutputSchema = Type.Object({
  uri: Type.String(),
  to: Type.String({
    description:
      "The wallet address that can use this signature to mint tokens. This is to prevent another wallet from intercepting the signature and using it to mint tokens for themselves.",
  }),
  royaltyRecipient: Type.Optional(
    Type.String({
      description:
        "The address that will receive the royalty fees from secondary sales. Defaults to the royaltyRecipient address of the contract.",
    }),
  ),
  quantity: Type.Optional(
    Type.String({
      description: "The number of tokens this signature can be used to mint.",
    }),
  ),
  royaltyBps: Type.Optional(
    Type.Number({
      description:
        "The percentage fee you want to charge for secondary sales. Defaults to the royaltyBps of the contract.",
    }),
  ),
  primarySaleRecipient: Type.Optional(
    Type.String({
      description:
        "If a price is specified, the funds will be sent to the primarySaleRecipient address. Defaults to the primarySaleRecipient address of the contract.",
    }),
  ),
  uid: Type.Optional(
    Type.String({
      description: `A unique identifier for the payload, used to prevent replay attacks and other types of exploits.
      Note that the input value gets hashed in the actual payload that gets generated. 
      The smart contract enforces on-chain that no uid gets used more than once, 
      which means you can deterministically generate the uid to prevent specific exploits.`,
    }),
  ),
  metadata: Type.Union([nftMetadataInputSchema, Type.String()]),
  currencyAddress: Type.Optional(
    Type.String({
      description:
        "The address of the currency to pay for minting the tokens (use the price field to specify the price). Defaults to NATIVE_TOKEN_ADDRESS",
    }),
  ),
  price: Type.Optional(
    Type.String({
      description:
        "If you want the user to pay for minting the tokens, you can specify the price per token. Defaults to 0.",
      default: "0",
    }),
  ),
  mintStartTime: Type.Optional(
    Type.Number({
      description:
        "The time from which the signature can be used to mint tokens. Defaults to now.",
      default: Date.now(),
    }),
  ),
  mintEndTime: Type.Optional(
    Type.Number({
      description:
        "The time until which the signature can be used to mint tokens. Defaults to 10 years from now.",
      default: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365 * 10).getTime(),
    }),
  ),
});
