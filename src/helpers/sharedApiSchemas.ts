import { TSchema, Type, Static } from "@sinclair/typebox";
import { FastifySchema } from "fastify/types/schema";
import { StatusCodes } from "http-status-codes";
import { RouteGenericInterface } from "fastify";

export const baseReplyErrorSchema = Type.Object({
  message: Type.String(),
  code: Type.String(),
  stack: Type.Optional(Type.String()),
  statusCode: Type.Number(),
  data: Type.Optional(Type.Any()),
});

/**
 * Used to surface application errors to the client. The `code` field is set by the request handler.
 */
// export const baseReplyErrorSchema = Nullable(errorSchema);

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
  result: Type.Optional(Type.Object({
    data: Type.Optional(Type.Union([Type.String(), Type.Object({})])),
    transaction: Type.Optional(Type.Any()),
    queuedId: Type.Optional(Type.String())
  })),
  error: Type.Optional(baseReplyErrorSchema),
});

export const standardResponseSchema = {
  [StatusCodes.OK]: replyBodySchema,
  [StatusCodes.UNAUTHORIZED]: {
    description: "Authentication information is missing or invalid",
    ...replyBodySchema,
  },
  [StatusCodes.BAD_REQUEST]: {
    description: "Bad Request",
    ...replyBodySchema,
  },
  [StatusCodes.NOT_FOUND]: {
    description: "Method Nor Found",
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
