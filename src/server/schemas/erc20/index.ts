import { type Static, Type } from "@sinclair/typebox";
import { AddressSchema } from "../address";

export const erc20MetadataSchema = Type.Object({
  name: Type.String(),
  symbol: Type.String(),
  decimals: Type.String(),
  value: Type.String({
    description: "Value in wei",
  }),
  displayValue: Type.String({
    description: "Value in tokens",
  }),
});

export const signature20InputSchema = Type.Object({
  to: Type.String({
    description:
      "The wallet address that can use this signature to mint tokens. This is to prevent another wallet from intercepting the signature and using it to mint tokens for themselves.",
  }),
  quantity: Type.String({
    description: "The number of tokens this signature can be used to mint.",
  }),
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
    }),
  ),
  mintStartTime: Type.Optional(
    Type.Union([
      Type.String({
        description:
          "The time until which the signature can be used to mint tokens. Defaults to 10 years from now.",
      }),
      Type.Integer({ minimum: 0 }),
    ]),
  ),
  mintEndTime: Type.Optional(
    Type.Union([
      Type.String({
        description:
          "The time until which the signature can be used to mint tokens. Defaults to 10 years from now.",
      }),
      Type.Integer({ minimum: 0 }),
    ]),
  ),
});

export const signature20OutputSchema = Type.Object({
  to: Type.String({
    description:
      "The wallet address that can use this signature to mint tokens. This is to prevent another wallet from intercepting the signature and using it to mint tokens for themselves.",
  }),
  quantity: Type.String({
    description: "The number of tokens this signature can be used to mint.",
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
  currencyAddress: {
    ...AddressSchema,
    description:
      "The address of the currency to pay for minting the tokens (use the price field to specify the price). Defaults to NATIVE_TOKEN_ADDRESS",
  },
  price: Type.String({
    description:
      "If you want the user to pay for minting the tokens, you can specify the price per token. Defaults to 0.",
  }),
  mintStartTime: Type.Integer({
    description:
      "The time from which the signature can be used to mint tokens. Defaults to now.",
    default: Date.now(),
    minimum: 0,
  }),
  mintEndTime: Type.Integer({
    description:
      "The time until which the signature can be used to mint tokens. Defaults to 10 years from now.",
    default: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365 * 10).getTime(),
    minimum: 0,
  }),
});

signature20InputSchema.examples = [
  {
    to: "0x1946267d81Fb8aDeeEa28e6B98bcD446c8248473",
    quantity: "1",
    mintStartTime: "2023-06-07T21:51:33.386Z",
    mintEndTime: "2023-07-07T21:51:33.386Z",
  },
];

signature20OutputSchema.examples = [
  {
    payload: {
      to: "0x1946267d81Fb8aDeeEa28e6B98bcD446c8248473",
      quantity: "1",
      primarySaleRecipient: "0x0000000000000000000000000000000000000000",
      uid: "0x3834383133343631326235613434363261623532623264643462336239373634",
      currencyAddress: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
      price: "0",
      mintStartTime: 1686174693,
      mintEndTime: 1688766693,
    },
    signature:
      "0xe16697bf7ede4ff4918f0dbc84953b964a84fed70cb3a0b0afb3ee9a55c9ff4d14e029bce8d8c74e71c1de32889c4eff529a9f7d45402455b8d15c7e6993c1c91b",
  },
];

export type erc20ResponseType = Omit<
  Omit<Static<typeof signature20InputSchema>, "mintStartTime">,
  "mintEndTime"
> & {
  mintStartTime: number | Date | undefined;
  mintEndTime: number | Date | undefined;
};
