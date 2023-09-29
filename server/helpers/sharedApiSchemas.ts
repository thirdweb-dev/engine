import { Static, Type } from "@sinclair/typebox";
import { PREBUILT_CONTRACTS_MAP } from "@thirdweb-dev/sdk";
import { RouteGenericInterface } from "fastify";
import { FastifySchema } from "fastify/types/schema";
import { StatusCodes } from "http-status-codes";

export const baseReplyErrorSchema = Type.Object({
  message: Type.Optional(Type.String()),
  reason: Type.Optional(Type.String()),
  code: Type.Optional(Type.String()),
  stack: Type.Optional(Type.String()),
  statusCode: Type.Optional(Type.Number()),
});

/**
 * Basic schema for Contract Request Parameters
 */
export const contractParamSchema = Type.Object({
  chain: Type.String({
    examples: ["mumbai"],
    description: "Chain ID or name",
  }),
  contract_address: Type.String({
    examples: ["0xc8be6265C06aC376876b4F62670adB3c4d72EABA"],
    description: "Contract address on the chain",
  }),
});

export const prebuiltDeployParamSchema = Type.Object({
  chain: Type.String({
    examples: ["mumbai"],
    description: "Chain ID or name",
  }),
  contract_type: Type.String({
    examples: Object.keys(PREBUILT_CONTRACTS_MAP),
    description: "Contract type to deploy",
  }),
});

export const publishedDeployParamSchema = Type.Object({
  chain: Type.String({
    examples: ["mumbai"],
    description: "Chain ID or name",
  }),
  publisher: Type.String({
    examples: ["deployer.thirdweb.eth"],
    description: "Address or ENS of the publisher of the contract",
  }),
  contract_name: Type.String({
    examples: ["AirdropERC20"],
    description: "Name of the published contract to deploy",
  }),
});

/**
 * Basic schema for all Response Body
 */
const replyBodySchema = Type.Object({
  result: Type.Optional(
    Type.Union([Type.String(), Type.Object({}), Type.Array(Type.Any())]),
  ),
});

const replyErrorBodySchema = Type.Object({
  error: Type.Optional(baseReplyErrorSchema),
});

export const standardResponseSchema = {
  [StatusCodes.OK]: replyBodySchema,
  [StatusCodes.BAD_REQUEST]: {
    description: "Bad Request",
    ...replyErrorBodySchema,
    examples: [
      {
        error: {
          message: "",
          code: "BAD_REQUEST",
          statusCode: StatusCodes.BAD_REQUEST,
        },
      },
    ],
  },
  [StatusCodes.NOT_FOUND]: {
    description: "Not Found",
    ...replyErrorBodySchema,
    examples: [
      {
        error: {
          message:
            "Transaction not found with queueId 9eb88b00-f04f-409b-9df7-7dcc9003bc35",
          code: "NOT_FOUND",
          statusCode: StatusCodes.NOT_FOUND,
        },
      },
    ],
  },
  [StatusCodes.INTERNAL_SERVER_ERROR]: {
    description: "Internal Server Error",
    ...replyErrorBodySchema,
    examples: [
      {
        error: {
          message:
            "Transaction simulation failed with reason: types/values length mismatch",
          code: "INTERNAL_SERVER_ERROR",
          statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
        },
      },
    ],
  },
};

/**
 * Basic Fastify Partial schema for request/response
 */
export const partialRouteSchema: FastifySchema = {
  params: contractParamSchema,
  response: standardResponseSchema,
};

export interface contractSchemaTypes extends RouteGenericInterface {
  Params: Static<typeof contractParamSchema>;
  Reply: Static<typeof replyBodySchema>;
}

export interface prebuiltDeploySchemaTypes extends RouteGenericInterface {
  Params: Static<typeof prebuiltDeployParamSchema>;
  Reply: Static<typeof replyBodySchema>;
}

export interface publishedDeploySchemaTypes extends RouteGenericInterface {
  Params: Static<typeof publishedDeployParamSchema>;
  Reply: Static<typeof replyBodySchema>;
}

export const transactionWritesResponseSchema = Type.Object({
  result: Type.Object({
    queueId: Type.String({
      description: "Queue ID",
    }),
  }),
});

transactionWritesResponseSchema.example = {
  result: {
    queueId: "9eb88b00-f04f-409b-9df7-7dcc9003bc35",
  },
};

/**
 * Basic schema for ERC721 Contract Request Parameters
 */
export const erc20ContractParamSchema = Type.Object({
  chain: Type.String({
    examples: ["mumbai"],
    description: "Chain ID or name",
  }),
  contract_address: Type.String({
    examples: ["0x365b83D67D5539C6583b9c0266A548926Bf216F4"],
    description: "ERC20 Contract Address on the Chain",
  }),
});

/**
 * Basic schema for ERC721 Contract Request Parameters
 */
export const erc1155ContractParamSchema = Type.Object({
  chain: Type.String({
    examples: ["mumbai"],
    description: "Chain ID or name",
  }),
  contract_address: Type.String({
    examples: ["0x19411143085F1ec7D21a7cc07000CBA5188C5e8e"],
    description: "ERC1155 Contract Address on the Chain",
  }),
});

/**
 * Basic schema for ERC721 Contract Request Parameters
 */
export const erc721ContractParamSchema = Type.Object({
  chain: Type.String({
    examples: ["mumbai"],
    description: "Chain ID or name",
  }),
  contract_address: Type.String({
    examples: ["0xc8be6265C06aC376876b4F62670adB3c4d72EABA"],
    description: "ERC721 Contract Address on the Chain",
  }),
});
export const currencyValueSchema = Type.Object({
  name: Type.String(),
  symbol: Type.String(),
  decimals: Type.Number(),
  value: Type.String(),
  displayValue: Type.String(),
});

currencyValueSchema.description =
  "The `CurrencyValue` of the listing. Useful for displaying the price information.";

export enum Status {
  UNSET = 0,
  Created = 1,
  Completed = 2,
  Cancelled = 3,
  Active = 4,
  Expired = 5,
}

export const marketplaceV3ContractParamSchema = Type.Object({
  chain: Type.String({
    examples: ["mumbai"],
    description: "Chain ID or name",
  }),
  contract_address: Type.String({
    examples: ["0xE8Bf1a01106F3acD7F84acaf5D668D7C9eA11535"],
    description: "Contract Address on the Chain",
  }),
});

export const marketplaceFilterSchema = Type.Object({
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

export const walletDetailsSchema = Type.Object({
  address: Type.String({
    description: "Wallet Address",
  }),
  type: Type.String({
    description: "Wallet Type",
  }),
  awsKmsKeyId: Type.Union([
    Type.String({
      description: "AWS KMS Key ID",
    }),
    Type.Null(),
  ]),
  awsKmsArn: Type.Union([
    Type.String({
      description: "AWS KMS Key ARN",
    }),
    Type.Null(),
  ]),
  gcpKmsKeyId: Type.Union([
    Type.String({
      description: "GCP KMS Key ID",
    }),
    Type.Null(),
  ]),
  gcpKmsKeyRingId: Type.Union([
    Type.String({
      description: "GCP KMS Key Ring ID",
    }),
    Type.Null(),
  ]),
  gcpKmsLocationId: Type.Union([
    Type.String({
      description: "GCP KMS Location ID",
    }),
    Type.Null(),
  ]),
  gcpKmsKeyVersionId: Type.Union([
    Type.String({
      description: "GCP KMS Key Version ID",
    }),
    Type.Null(),
  ]),
  gcpKmsResourcePath: Type.Union([
    Type.String({
      description: "GCP KMS Resource Path",
    }),
    Type.Null(),
  ]),
});
