import { Type, type Static } from "@sinclair/typebox";
import { PREBUILT_CONTRACTS_MAP } from "@thirdweb-dev/sdk";
import type { RouteGenericInterface } from "fastify";
import type { FastifySchema } from "fastify/types/schema";
import { StatusCodes } from "http-status-codes";
import { AddressSchema } from "./address";
import { chainIdOrSlugSchema } from "./chain";

export const baseReplyErrorSchema = Type.Object({
  message: Type.Optional(Type.String()),
  reason: Type.Optional(Type.Any()),
  code: Type.Optional(Type.String()),
  stack: Type.Optional(Type.String()),
  statusCode: Type.Optional(Type.Integer()),
});

/**
 * Basic schema for Request Parameters
 */
export const contractParamSchema = Type.Object({
  chain: chainIdOrSlugSchema,
  contractAddress: {
    ...AddressSchema,
    description: "Contract address",
  },
});

export const requestQuerystringSchema = Type.Object({
  simulateTx: Type.Optional(
    Type.Boolean({
      description:
        "Simulates the transaction before adding it to the queue, returning an error if it fails simulation. Note: This step is less performant and recommended only for debugging purposes.",
      default: false,
    }),
  ),
});

export const prebuiltDeployParamSchema = Type.Object({
  chain: chainIdOrSlugSchema,
  contractType: Type.String({
    examples: Object.keys(PREBUILT_CONTRACTS_MAP),
    description: "Contract type to deploy",
  }),
});

export const publishedDeployParamSchema = Type.Object({
  chain: chainIdOrSlugSchema,
  publisher: Type.String({
    examples: ["deployer.thirdweb.eth"],
    description: "Address or ENS of the publisher of the contract",
  }),
  contractName: Type.String({
    examples: ["AirdropERC20"],
    description: "Name of the published contract to deploy",
  }),
});

/**
 * Basic schema for all Response Body
 */
const replyBodySchema = Type.Object({
  result: Type.Optional(
    Type.Union([
      Type.Number(),
      Type.String(),
      Type.Object({}),
      Type.Array(Type.Any()),
      Type.Boolean(),
      Type.Tuple([Type.Any(), Type.Any()]),
    ]),
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

export const simulateResponseSchema = Type.Object({
  result: Type.Object({
    success: Type.Boolean({
      description: "Simulation Success",
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
  chain: chainIdOrSlugSchema,
  contractAddress: {
    ...AddressSchema,
    description: "ERC20 contract address",
  },
});

/**
 * Basic schema for ERC721 Contract Request Parameters
 */
export const erc1155ContractParamSchema = Type.Object({
  chain: chainIdOrSlugSchema,
  contractAddress: {
    ...AddressSchema,
    description: "ERC1155 contract address",
  },
});

/**
 * Basic schema for ERC721 Contract Request Parameters
 */
export const erc721ContractParamSchema = Type.Object({
  chain: chainIdOrSlugSchema,
  contractAddress: {
    ...AddressSchema,
    description: "ERC721 contract address",
  },
});
export const currencyValueSchema = Type.Object({
  name: Type.String(),
  symbol: Type.String(),
  decimals: Type.Integer(),
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
  chain: chainIdOrSlugSchema,
  contractAddress: {
    ...AddressSchema,
    description: "Contract address",
  },
});

export const marketplaceFilterSchema = Type.Object({
  count: Type.Optional(
    Type.Integer({
      description: "Number of listings to fetch",
      minimum: 1,
    }),
  ),
  offeror: Type.Optional({
    ...AddressSchema,
    description: "has offers from this Address",
  }),
  seller: Type.Optional({
    ...AddressSchema,
    description: "Being sold by this Address",
  }),
  start: Type.Optional(
    Type.Integer({
      description: "Start from this index (pagination)",
      minimum: 0,
    }),
  ),
  tokenContract: Type.Optional({
    ...AddressSchema,
    description: "Token contract address to show NFTs from",
  }),
  tokenId: Type.Optional(
    Type.String({
      description: "Only show NFTs with this ID",
    }),
  ),
});

export const walletDetailsSchema = Type.Object({
  address: {
    ...AddressSchema,
    description: "Wallet Address",
  },
  type: Type.String({
    description: "Wallet Type",
  }),
  label: Type.Union([
    Type.String({
      description: "A label for your wallet",
    }),
    Type.Null(),
  ]),
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

export const contractSubscriptionConfigurationSchema = Type.Object({
  maxBlocksToIndex: Type.Integer(),
  contractSubscriptionsRequeryDelaySeconds: Type.String(),
});
