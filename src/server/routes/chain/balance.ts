// src/routes/onchain/balance.ts

import { describeRoute } from "hono-openapi";
import { resolver, validator } from "hono-openapi/zod";
import * as z from "zod";
import { ResultAsync } from "neverthrow";
import {
  accountActionErrorMapper,
  engineErrToHttpException,
  zErrorMapper,
} from "../../../lib/errors.js"; // Adjust path as needed
import { thirdwebClient } from "../../../lib/thirdweb-client.js"; // Adjust path as needed
import { wrapResponseSchema } from "../../schemas/shared-api-schemas.js"; // Adjust path as needed
import { evmAddressSchema } from "../../../lib/zod.js"; // Adjust path as needed
import { getChain } from "../../../lib/chain.js"; // Adjust path as needed
import { serialisedBigIntSchema } from "../../../executors/types.js"; // Adjust path as needed
import { onchainRoutesFactory } from "./factory.js"; // Adjust path as needed
import { eth_getBalance, getRpcClient } from "thirdweb";

// --- Schemas ---

// Schema for the request body
const balanceRequestSchema = z.object({
  chainId: z.string().describe("The chain ID to query the balance on."),
  address: evmAddressSchema.describe(
    "The EVM address to get the native balance for.",
  ),
});

// Schema for the successful response data
const balanceSuccessSchema = z.object({
  balance: serialisedBigIntSchema.describe(
    "The native balance of the address as a stringified integer.",
  ),
});

// Schema for the final wrapped API response
const balanceResponseSchema = wrapResponseSchema(balanceSuccessSchema);

// --- Route Handler ---

export const getNativeBalanceRoute = onchainRoutesFactory.createHandlers(
  describeRoute({
    tags: ["Read"],
    summary: "Native Balance",
    description:
      "Fetches the native cryptocurrency balance (e.g., ETH, MATIC) for a given address on a specific chain.",
    responses: {
      200: {
        description: "OK - Balance fetched successfully.",
        content: {
          "application/json": { schema: resolver(balanceResponseSchema) },
        },
      },
      // Include standard error responses if your factory doesn't handle them
      400: { description: "Bad Request - Invalid input" },
      500: { description: "Internal Server Error" },
    },
  }),
  validator("json", balanceRequestSchema, zErrorMapper),
  async (c) => {
    const body = c.req.valid("json");
    const { chainId, address } = body;

    const chain = getChain(Number.parseInt(chainId)); // Assuming getChain handles potential errors
    const overrideThirdwebClient = c.get("thirdwebClient");
    const client = overrideThirdwebClient ?? thirdwebClient;
    const rpcClient = getRpcClient({ client, chain });

    // Use ResultAsync to handle the potential promise rejection from getBalance
    const balanceResult = await ResultAsync.fromPromise(
      eth_getBalance(rpcClient, { address }),
      accountActionErrorMapper({
        code: "get_balance_failed",
        status: 500, // Or 404/400 depending on expected errors
        defaultMessage: `Failed to fetch native balance for address ${address} on chain ${chainId}`,
        address: address,
        chainId: chainId,
      }),
    );

    // Handle potential errors during the balance fetch
    if (balanceResult.isErr()) {
      // Convert the EngineErr to an HTTPException using the existing utility
      throw engineErrToHttpException(balanceResult.error);
    }

    // Extract the balance (which is a bigint)
    const balanceBigInt = balanceResult.value;

    // Format the successful response
    return c.json({
      result: {
        balance: balanceBigInt.toString(), // Serialize bigint to string for JSON
      },
    });
  },
);
