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
  royaltyRecipient: Type.String({
    description:
      "The address that will receive the royalty fees from secondary sales. Defaults to the royaltyRecipient address of the contract.",
  }),
  quantity: Type.String({
    description: "The number of tokens this signature can be used to mint.",
  }),
  royaltyBps: Type.String({
    description:
      "The percentage fee you want to charge for secondary sales. Defaults to the royaltyBps of the contract.",
  }),
  primarySaleRecipient: Type.String({
    description:
      "If a price is specified, the funds will be sent to the primarySaleRecipient address. Defaults to the primarySaleRecipient address of the contract.",
  }),
  uid: Type.String({
    description: `A unique identifier for the payload, used to prevent replay attacks and other types of exploits.
      Note that the input value gets hashed in the actual payload that gets generated. 
      The smart contract enforces on-chain that no uid gets used more than once, 
      which means you can deterministically generate the uid to prevent specific exploits.`,
  }),
  metadata: Type.Union([nftMetadataInputSchema, Type.String()]),
  currencyAddress: Type.String({
    description:
      "The address of the currency to pay for minting the tokens (use the price field to specify the price). Defaults to NATIVE_TOKEN_ADDRESS",
  }),
  price: Type.String({
    description:
      "If you want the user to pay for minting the tokens, you can specify the price per token. Defaults to 0.",
    default: "0",
  }),
  mintStartTime: Type.Number({
    description:
      "The time from which the signature can be used to mint tokens. Defaults to now.",
    default: Date.now(),
  }),
  mintEndTime: Type.Number({
    description:
      "The time until which the signature can be used to mint tokens. Defaults to 10 years from now.",
    default: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365 * 10).getTime(),
  }),
});

export const signature1155InputSchema = Type.Object({
  to: Type.String({
    description:
      "The wallet address that can use this signature to mint tokens. This is to prevent another wallet from intercepting the signature and using it to mint tokens for themselves.",
  }),
  royaltyRecipient: Type.String({
    description:
      "The address that will receive the royalty fees from secondary sales. Defaults to the royaltyRecipient address of the contract.",
  }),
  quantity: Type.String({
    description: "The number of tokens this signature can be used to mint.",
  }),
  royaltyBps: Type.Number({
    description:
      "The percentage fee you want to charge for secondary sales. Defaults to the royaltyBps of the contract.",
  }),
  primarySaleRecipient: Type.String({
    description:
      "If a price is specified, the funds will be sent to the primarySaleRecipient address. Defaults to the primarySaleRecipient address of the contract.",
  }),
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
  price: Type.String({
    description:
      "If you want the user to pay for minting the tokens, you can specify the price per token. Defaults to 0.",
    default: "0",
  }),
  mintStartTime: Type.Number({
    description:
      "The time from which the signature can be used to mint tokens. Defaults to now.",
    default: Date.now(),
  }),
  mintEndTime: Type.Number({
    description:
      "The time until which the signature can be used to mint tokens. Defaults to 10 years from now.",
    default: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365 * 10).getTime(),
  }),
});

export const signature1155OutputSchema = Type.Object({
  uri: Type.String(),
  tokenId: Type.String(),
  to: Type.String({
    description:
      "The wallet address that can use this signature to mint tokens. This is to prevent another wallet from intercepting the signature and using it to mint tokens for themselves.",
  }),
  royaltyRecipient: Type.String({
    description:
      "The address that will receive the royalty fees from secondary sales. Defaults to the royaltyRecipient address of the contract.",
  }),
  quantity: Type.String({
    description: "The number of tokens this signature can be used to mint.",
  }),
  royaltyBps: Type.String({
    description:
      "The percentage fee you want to charge for secondary sales. Defaults to the royaltyBps of the contract.",
  }),
  primarySaleRecipient: Type.String({
    description:
      "If a price is specified, the funds will be sent to the primarySaleRecipient address. Defaults to the primarySaleRecipient address of the contract.",
  }),
  uid: Type.String({
    description: `A unique identifier for the payload, used to prevent replay attacks and other types of exploits.
      Note that the input value gets hashed in the actual payload that gets generated. 
      The smart contract enforces on-chain that no uid gets used more than once, 
      which means you can deterministically generate the uid to prevent specific exploits.`,
  }),
  metadata: Type.Union([nftMetadataInputSchema, Type.String()]),
  currencyAddress: Type.String({
    description:
      "The address of the currency to pay for minting the tokens (use the price field to specify the price). Defaults to NATIVE_TOKEN_ADDRESS",
  }),
  price: Type.String({
    description:
      "If you want the user to pay for minting the tokens, you can specify the price per token. Defaults to 0.",
    default: "0",
  }),
  mintStartTime: Type.Number({
    description:
      "The time from which the signature can be used to mint tokens. Defaults to now.",
    default: Date.now(),
  }),
  mintEndTime: Type.Number({
    description:
      "The time until which the signature can be used to mint tokens. Defaults to 10 years from now.",
    default: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365 * 10).getTime(),
  }),
});

// Examples

signature721InputSchema.examples = [
  {
    to: "0x1946267d81Fb8aDeeEa28e6B98bcD446c8248473",
    quantity: "1",
    metadata: {
      name: "test tokenII",
      description: "test token",
    },
  },
];

signature721OutputSchema.examples = [
  {
    payload: {
      uri: "ipfs://QmP1i29T534877ptz8bazU1eYiYLzQ1GRK4cnZWngsz9ud/0",
      to: "0x1946267d81Fb8aDeeEa28e6B98bcD446c8248473",
      royaltyRecipient: "0x0000000000000000000000000000000000000000",
      quantity: "1",
      royaltyBps: "0",
      primarySaleRecipient: "0x0000000000000000000000000000000000000000",
      uid: "0x3862386334363135326230303461303939626136653361643131343836373563",
      metadata: {
        name: "test tokenII",
        description: "test token",
      },
      currencyAddress: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
      price: "0",
      mintStartTime: 1686169938,
      mintEndTime: 2001529938,
    },
    signature:
      "0xe6f2e29f32f7da65385effa2ed4f39b8d3caf08b025eb0004fd4695b42ee145f2c7afdf2764f0097c9ed5d88b50e97c4c638f91289408fa7d7a0834cd707c4a41b",
  },
];
