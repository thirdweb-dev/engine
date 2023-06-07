import { Type } from "@sinclair/typebox";

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
