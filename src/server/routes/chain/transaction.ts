import { describeRoute } from "hono-openapi";
import { resolver, validator } from "hono-openapi/zod";
import * as z from "zod";
import { execute } from "../../../executors/execute/execute.js";
import {
  encodedExecutionRequestSchema,
  transactionResponseSchema,
} from "../../../executors/types.js";
import { engineErrToHttpException, zErrorMapper } from "../../../lib/errors.js";
import { thirdwebClient } from "../../../lib/thirdweb-client.js";
import { wrapResponseSchema } from "../../schemas/shared-api-schemas.js";
import { onchainRoutesFactory } from "./factory.js";
import { transactionDbEntrySchema } from "../../../db/derived-schemas.js";

export const sendTransactionRoute = onchainRoutesFactory.createHandlers(
  describeRoute({
    tags: ["Write"],
    summary: "Encoded Transaction",
    description: "Send a transaction or a batch of transactions",
    responses: {
      200: {
        description: "Transaction sent successfully",
        content: {
          "application/json": {
            schema: resolver(
              wrapResponseSchema(z.array(transactionDbEntrySchema)),
            ),
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
  validator("json", encodedExecutionRequestSchema, zErrorMapper),
  async (c) => {
    const executionRequest = c.req.valid("json");

    const overrideThirdwebClient = c.get("thirdwebClient");

    if (overrideThirdwebClient) {
      console.log("found override");
      console.log(overrideThirdwebClient.clientId);
    }

    const executionResult = await execute({
      client: overrideThirdwebClient ?? thirdwebClient,
      request: executionRequest,
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
