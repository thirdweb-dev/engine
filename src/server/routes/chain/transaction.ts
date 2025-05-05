import { describeRoute } from "hono-openapi";
import { resolver, validator } from "hono-openapi/zod";
import { execute } from "../../../executors/execute/execute.js";
import {
  encodedExecutionRequestSchema,
  transactionResponseSchema,
} from "../../../executors/types.js";
import { engineErrToHttpException, zErrorMapper } from "../../../lib/errors.js";
import { thirdwebClient } from "../../../lib/thirdweb-client.js";
import { getThirdwebCredentialsFromContext } from "../../middleware/thirdweb-client.js";
import {
  credentialsFromHeaders,
  executionCredentialsHeadersSchema,
} from "../../schemas/shared-api-schemas.js";
import { onchainRoutesFactory } from "./factory.js";

export const sendTransactionRoute = onchainRoutesFactory.createHandlers(
  validator("header", executionCredentialsHeadersSchema, zErrorMapper),
  validator("json", encodedExecutionRequestSchema, zErrorMapper),
  describeRoute({
    tags: ["Write"],
    operationId: "sendTransaction",
    summary: "Send Transaction",
    description: "Send an encoded transaction or a batch of transactions",
    responses: {
      200: {
        description: "Transaction sent successfully",
        content: {
          "application/json": {
            schema: resolver(transactionResponseSchema),
          },
        },
      },
      202: {
        description: "Transaction queued successfully",
        content: {
          "application/json": {
            schema: resolver(transactionResponseSchema),
          },
        },
      },
    },
  }),
  async (c) => {
    const executionRequest = c.req.valid("json");
    const credentials = c.req.valid("header");

    const overrideThirdwebClient = c.get("thirdwebClient");

    if (overrideThirdwebClient) {
      console.log("found override");
      console.log(overrideThirdwebClient.clientId);
    }

    const executionResult = await execute({
      client: overrideThirdwebClient ?? thirdwebClient,
      request: executionRequest,
      credentials: {
        ...credentialsFromHeaders(credentials),
        ...getThirdwebCredentialsFromContext(c),
      },
    });

    if (executionResult.isErr()) {
      throw engineErrToHttpException(executionResult.error);
    }

    return c.json({
      result: {
        transactions: executionResult.value.transactions,
      },
    });
  },
);
