import { Static, Type } from "@sinclair/typebox";
import { BigNumber } from "ethers";

export const nftMetadataInputSchema = Type.Object({
  name: Type.Optional(Type.Union([Type.String(), Type.Number(), Type.Null()])),
  description: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  image: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  external_url: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  animation_url: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  properties: Type.Optional(Type.Union([Type.Any(), Type.Null()])),
  attributes: Type.Optional(Type.Union([Type.Any(), Type.Null()])),
  background_color: Type.Optional(Type.Union([Type.Any(), Type.Null()])),
});

export const nftMetadataSchema = Type.Object(
  {
    id: Type.String(),
    uri: Type.String(),
    name: Type.Optional(
      Type.Union([Type.String(), Type.Number(), Type.Null()]),
    ),
    description: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    image: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    external_url: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    animation_url: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    properties: Type.Optional(Type.Union([Type.Any(), Type.Null()])),
    attributes: Type.Optional(Type.Union([Type.Any(), Type.Null()])),
  },
  {
    additionalProperties: true,
  },
);

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
    Type.Union([
      Type.String({
        description:
          "The time until which the signature can be used to mint tokens. Defaults to 10 years from now.",
      }),
      Type.Number(),
    ]),
  ),
  mintEndTime: Type.Optional(
    Type.Union([
      Type.String({
        description:
          "The time until which the signature can be used to mint tokens. Defaults to 10 years from now.",
      }),
      Type.Number(),
    ]),
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
  }),
  mintEndTime: Type.Number({
    description:
      "The time until which the signature can be used to mint tokens. Defaults to 10 years from now.",
  }),
});

export const signature1155InputSchema = Type.Object({
  to: Type.String({
    description:
      "The wallet address that can use this signature to mint tokens. This is to prevent another wallet from intercepting the signature and using it to mint tokens for themselves.",
  }),
  quantity: Type.String({
    description: "The number of tokens this signature can be used to mint.",
  }),
  metadata: Type.Union([nftMetadataInputSchema, Type.String()]),
  royaltyRecipient: Type.Optional(
    Type.String({
      description:
        "The address that will receive the royalty fees from secondary sales. Defaults to the royaltyRecipient address of the contract.",
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
    Type.Union([
      Type.String({
        description:
          "The time until which the signature can be used to mint tokens. Defaults to 10 years from now.",
      }),
      Type.Number(),
    ]),
  ),
  mintEndTime: Type.Optional(
    Type.Union([
      Type.String({
        description:
          "The time until which the signature can be used to mint tokens. Defaults to 10 years from now.",
      }),
      Type.Number(),
    ]),
  ),
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
      "The time from which the signature can be used to mint tokens. Defaults to now if value not provided.",
  }),
  mintEndTime: Type.Number({
    description:
      "The time until which the signature can be used to mint tokens. Defaults to 10 years from now.",
  }),
});

export type ercNFTResponseType = (
  | Omit<
      Omit<Static<typeof signature721InputSchema>, "mintStartTime">,
      "mintEndTime"
    >
  | Omit<
      Omit<Static<typeof signature1155InputSchema>, "mintStartTime">,
      "mintEndTime"
    >
) & {
  mintStartTime: number | Date | undefined;
  mintEndTime: number | Date | undefined;
  quantity: string | number | bigint | BigNumber;
};

// Examples

signature721InputSchema.examples = [
  {
    to: "0x1946267d81Fb8aDeeEa28e6B98bcD446c8248473",
    quantity: "1",
    metadata: {
      name: "test tokenII",
      description: "test token",
    },
    mintStartTime: "2023-06-07T21:51:33.386Z",
    mintEndTime: "2023-07-07T21:51:33.386Z",
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

signature1155InputSchema.examples = [
  {
    to: "0x1946267d81Fb8aDeeEa28e6B98bcD446c8248473",
    quantity: "1",
    metadata: {
      name: "test tokenII",
      description: "test token",
    },
    mintStartTime: "2023-06-07T21:51:33.386Z",
    mintEndTime: "2023-07-07T21:51:33.386Z",
  },
];

signature1155OutputSchema.examples = [
  {
    payload: {
      uri: "ipfs://QmP1i29T534877ptz8bazU1eYiYLzQ1GRK4cnZWngsz9ud/0",
      tokenId:
        "115792089237316195423570985008687907853269984665640564039457584007913129639935",
      to: "0x1946267d81Fb8aDeeEa28e6B98bcD446c8248473",
      royaltyRecipient: "0x0000000000000000000000000000000000000000",
      quantity: "1",
      royaltyBps: "0",
      primarySaleRecipient: "0x0000000000000000000000000000000000000000",
      uid: "0x3462396330333131353033363433336439343162303033363933373333396232",
      metadata: {
        name: "test tokenII",
        description: "test token",
      },
      currencyAddress: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
      price: "0",
      mintStartTime: 1686174693,
      mintEndTime: 1688766693,
    },
    signature:
      "0x674414eb46d1be3fb8f703b51049aa857b27c70c72293f054ed211be0efb843841bcd86b1245c321b20e50e2a9bebb555e70246d84778d5e76668db2f102c6401b",
  },
];

export const newSignature721InputSchema = Type.Object({
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
    Type.Union([
      Type.String({
        description:
          "The time until which the signature can be used to mint tokens. Defaults to 10 years from now.",
      }),
      Type.Number(),
    ]),
  ),
  mintEndTime: Type.Optional(
    Type.Union([
      Type.String({
        description:
          "The time until which the signature can be used to mint tokens. Defaults to 10 years from now.",
      }),
      Type.Number(),
    ]),
  ),
  uri: Type.String({
    description: "The URI of the NFT Metadata. Should be an IPFS URI.",
  }),
});

export type newErcNFTResponseType = Omit<
  Omit<Static<typeof newSignature721InputSchema>, "mintStartTime">,
  "mintEndTime"
> & {
  mintStartTime: number | Date | undefined;
  mintEndTime: number | Date | undefined;
  quantity: string | number | bigint | BigNumber;
};
