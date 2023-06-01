import { Type, Static } from "@sinclair/typebox";
import { FastifySchema } from "fastify/types/schema";
import { StatusCodes } from "http-status-codes";
import { RouteGenericInterface } from "fastify";
import { PREBUILT_CONTRACTS_MAP } from "@thirdweb-dev/sdk";

export const baseReplyErrorSchema = Type.Object({
  message: Type.Optional(Type.String()),
  reason: Type.Optional(Type.String()),
  code: Type.Optional(Type.String()),
  stack: Type.Optional(Type.String()),
  statusCode: Type.Optional(Type.Number()),
});

/**
 * Basic schema for all Contract Request Parameters
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
    examples: Object.keys(PREBUILT_CONTRACTS_MAP),
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
  result: Type.Optional(
    Type.Object({
      data: Type.Optional(Type.Union([Type.String(), Type.Object({})])),
      transaction: Type.Optional(Type.Any()),
      queuedId: Type.Optional(Type.String()),
    }),
  ),
  error: Type.Optional(baseReplyErrorSchema),
});

export const writeReplyBodySchema = Type.Object({
  queuedId: Type.Optional(Type.String()),
  error: Type.Optional(baseReplyErrorSchema),
});

export const standardResponseSchema = {
  [StatusCodes.OK]: replyBodySchema,
  [StatusCodes.BAD_REQUEST]: {
    description: "Bad Request",
    ...replyBodySchema,
  },
  [StatusCodes.NOT_FOUND]: {
    description: "Not Found",
    ...replyBodySchema,
  },
  [StatusCodes.INTERNAL_SERVER_ERROR]: {
    description: "Internal Server Error",
    ...replyBodySchema,
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
  queuedId: Type.Optional(Type.String()),
  error: Type.Optional(baseReplyErrorSchema),
});
