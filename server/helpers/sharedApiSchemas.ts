import { TSchema, Type, Static } from "@sinclair/typebox";
import { FastifySchema } from "fastify/types/schema";
import { StatusCodes } from "http-status-codes";
import { RouteGenericInterface } from "fastify";

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
  chain_name_or_id: Type.String({
    examples: ["mumbai"],
    description: "Add Chain ID or Chain Name",
  }),
  contract_address: Type.String({
    examples: ["0xc8be6265C06aC376876b4F62670adB3c4d72EABA"],
    description: "Contract Addres on the Chain",
  }),
});

export const prebuiltDeployParamSchema = Type.Object({
  chain_name_or_id: Type.String({
    examples: ["mumbai"],
    description: "Add Chain ID or Chain Name",
  }),
  contract_type: Type.String({
    examples: [
      "nft-collection",
      "nft-drop",
      "edition",
      "edition-drop",
      "token",
      "token-drop",
      "marketplace-v3",
      "pack",
      "split",
    ],
    description: "Contract Type to deploy",
  }),
});

export const publishedDeployParamSchema = Type.Object({
  chain_name_or_id: Type.String({
    examples: ["mumbai"],
    description: "Add Chain ID or Chain Name",
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
  result: Type.Optional(Type.Union([Type.String(), Type.Object({})]))
});

replyBodySchema.examples = [{
  result: 'ERC20-Test-Token'
}];

const replyErrorBodySchema = Type.Object({
  error: Type.Optional(baseReplyErrorSchema),
});

export const standardResponseSchema = {
  [StatusCodes.OK]: replyBodySchema,
  [StatusCodes.BAD_REQUEST]: {
    description: "Bad Request",
    ...replyErrorBodySchema,
    examples: [{
      error: {
        message: "",
        code: "BAD_REQUEST",
        statusCode: StatusCodes.BAD_REQUEST,
      }
    }],
  },
  [StatusCodes.NOT_FOUND]: {
    description: "Not Found",
    ...replyErrorBodySchema,
    examples: [{
      error: {
        message: "Transaction not found with queueId 9eb88b00-f04f-409b-9df7-7dcc9003bc35",
        code: "NOT_FOUND",
        statusCode: StatusCodes.NOT_FOUND,
      }
    }],
  },
  [StatusCodes.INTERNAL_SERVER_ERROR]: {
    description: "Internal Server Error",
    ...replyErrorBodySchema,
    examples: [{
      error: {
        message: "Transaction simulation failed with reason: types/values length mismatch",
        code: "INTERNAL_SERVER_ERROR",
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      }
    }],
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

export interface TransactionSchema {
  identifier?: string;
  walletAddress?: string;
  contractAddress?: string;
  chainId?: string;
  extension?: string;
  rawFunctionName?: string;
  rawFunctionArgs?: string;
  txProcessed?: boolean;
  txSubmitted?: boolean;
  txErrored?: boolean;
  txMined?: boolean;
  encodedInputData?: string;
  txType?: number;
  gasPrice?: string;
  gasLimit?: string;
  maxPriorityFeePerGas?: string;
  maxFeePerGas?: string;
  txHash?: string;
}

export const transactionWritesResponseSchema = Type.Object({
  result: Type.String({
    description: "Queue ID",
  }),
});

transactionWritesResponseSchema.examples = [{
  result: "9eb88b00-f04f-409b-9df7-7dcc9003bc35",
}];

/**
 * Basic schema for ERC721 Contract Request Parameters
 */
export const erc20ContractParamSchema = Type.Object({
  chain_name_or_id: Type.String({
    examples: ["mumbai"],
    description: "Add Chain ID or Chain Name",
  }),
  contract_address: Type.String({
    examples: ["0x365b83D67D5539C6583b9c0266A548926Bf216F4"],
    description: "ERC20 Contract Addres on the Chain",
  }),
});

/**
 * Basic schema for ERC721 Contract Request Parameters
 */
export const erc1155ContractParamSchema = Type.Object({
  chain_name_or_id: Type.String({
    examples: ["mumbai"],
    description: "Add Chain ID or Chain Name",
  }),
  contract_address: Type.String({
    examples: ["0x19411143085F1ec7D21a7cc07000CBA5188C5e8e"],
    description: "ERC1155 Contract Addres on the Chain",
  }),
});

/**
 * Basic schema for ERC721 Contract Request Parameters
 */
export const erc721ContractParamSchema = Type.Object({
  chain_name_or_id: Type.String({
    examples: ["mumbai"],
    description: "Add Chain ID or Chain Name",
  }),
  contract_address: Type.String({
    examples: ["0xc8be6265C06aC376876b4F62670adB3c4d72EABA"],
    description: "ERC721 Contract Addres on the Chain",
  }),
});