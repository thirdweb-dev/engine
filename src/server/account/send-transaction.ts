import { describeRoute } from "hono-openapi";
import { resolver, validator } from "hono-openapi/zod";
import * as z from "zod";
import { execute } from "../../executors/execute/execute";
import {
  encodedExecutionRequestSchema,
  transactionResponseSchema,
} from "../../executors/types";
import { engineErrToHttpException, zErrorMapper } from "../../lib/errors";
import { thirdwebClient } from "../../lib/thirdweb-client";
import { wrapResponseSchema } from "../schemas/shared-api-schemas";
import { accountRoutesFactory } from "./factory";
import { transactionDbEntrySchema } from "../../db/derived-schemas";

export const sendTransactionRoute = accountRoutesFactory.createHandlers(
  describeRoute({
    tags: ["Account"],
    summary: "Send Transaction",
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
