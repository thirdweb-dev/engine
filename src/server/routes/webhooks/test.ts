import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getWebhook } from "../../../shared/db/webhooks/get-webhook.js";
import { sendWebhookRequest } from "../../../shared/utils/webhook.js";
import { createCustomError } from "../../middleware/error.js";
import { NumberStringSchema } from "../../schemas/number.js";
import { standardResponseSchema } from "../../schemas/shared-api-schemas.js";
import type { TransactionSchema } from "../../schemas/transaction/index.js";

const paramsSchema = Type.Object({
  webhookId: NumberStringSchema,
});

const responseBodySchema = Type.Object({
  result: Type.Object({
    ok: Type.Boolean(),
    status: Type.Number(),
    body: Type.String(),
  }),
});

export async function testWebhookRoute(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof paramsSchema>;
    Reply: Static<typeof responseBodySchema>;
  }>({
    method: "POST",
    url: "/webhooks/:webhookId/test",
    schema: {
      summary: "Test webhook",
      description: "Send a test payload to a webhook.",
      tags: ["Webhooks"],
      operationId: "testWebhook",
      params: paramsSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseBodySchema,
      },
    },
    handler: async (req, res) => {
      const { webhookId } = req.params;

      const webhook = await getWebhook(Number.parseInt(webhookId));
      if (!webhook) {
        throw createCustomError(
          "Webhook not found.",
          StatusCodes.BAD_REQUEST,
          "NOT_FOUND",
        );
      }

      const webhookBody: Static<typeof TransactionSchema> = {
        // Queue details
        queueId: "1411246e-b1c8-4f5d-9a25-8c1f40b54e55",
        status: "mined",
        onchainStatus: "success",
        queuedAt: "2023-09-29T22:01:31.031Z",
        sentAt: "2023-09-29T22:01:41.580Z",
        minedAt: "2023-09-29T22:01:44.000Z",
        errorMessage: null,
        cancelledAt: null,
        retryCount: 0,

        // Onchain details
        chainId: "80002",
        fromAddress: "0x3ecdbf3b911d0e9052b64850693888b008e18373",
        toAddress: "0x365b83d67d5539c6583b9c0266a548926bf216f4",
        data: "0xa9059cbb0000000000000000000000003ecdbf3b911d0e9052b64850693888b008e183730000000000000000000000000000000000000000000000000000000000000064",
        value: "0x00",
        nonce: 1786,
        gasLimit: "39580",
        maxFeePerGas: "2063100466",
        maxPriorityFeePerGas: "1875545856",
        gasPrice: "1875545871",
        transactionType: 2,
        transactionHash:
          "0xc3ffa42dd4734b017d483e1158a2e936c8a97dd1aa4e4ce11df80ac8e81d2c7e",
        sentAtBlockNumber: 40660021,
        blockNumber: 40660026,

        // User operation (account abstraction) details
        signerAddress: null,
        accountAddress: null,
        accountFactoryAddress: null,
        target: null,
        sender: null,
        initCode: null,
        callData: null,
        callGasLimit: null,
        verificationGasLimit: null,
        preVerificationGas: null,
        paymasterAndData: null,
        userOpHash: null,
        accountSalt: null,
        batchOperations: null,

        // Off-chain details
        functionName: "transfer",
        functionArgs: "0x3ecdbf3b911d0e9052b64850693888b008e18373,100",
        extension: "none",
        deployedContractAddress: null,
        deployedContractType: null,

        // Deprecated
        retryGasValues: null,
        retryMaxFeePerGas: null,
        retryMaxPriorityFeePerGas: null,
        effectiveGasPrice: null,
        cumulativeGasUsed: null,
        onChainTxStatus: 1,
      };

      const resp = await sendWebhookRequest(webhook, webhookBody);

      res.status(StatusCodes.OK).send({
        result: resp,
      });
    },
  });
}
