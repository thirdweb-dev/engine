import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { upsertChainIndexer } from "../../../../db/chainIndexers/upsertChainIndexer";
import { createContractSubscription } from "../../../../db/contractSubscriptions/createContractSubscription";
import { getContractSubscriptionsUniqueChainIds } from "../../../../db/contractSubscriptions/getContractSubscriptions";
import { insertWebhook } from "../../../../db/webhooks/createWebhook";
import { WebhooksEventTypes } from "../../../../schema/webhooks";
import { getSdk } from "../../../../utils/cache/getSdk";
import { createCustomError } from "../../../middleware/error";
import {
  contractSubscriptionSchema,
  toContractSubscriptionSchema,
} from "../../../schemas/contractSubscription";
import { standardResponseSchema } from "../../../schemas/sharedApiSchemas";
import { getChainIdFromChain } from "../../../utils/chain";
import { isValidHttpUrl } from "../../../utils/validator";

const bodySchema = Type.Object({
  chain: Type.String({
    description: "The chain for the contract.",
  }),
  contractAddress: Type.String({
    description: "The address for the contract.",
  }),
  webhookUrl: Type.Optional(
    Type.String({
      description: "Webhook URL",
      examples: ["https://example.com/webhook"],
    }),
  ),
  processEventLogs: Type.Boolean({
    description: "If true, parse event logs for this contract.",
  }),
  filterEvents: Type.Optional(
    Type.Array(Type.String(), {
      description:
        "A case-sensitive list of event log names to parse. If empty, parse all event logs.",
    }),
  ),
  processTransactionReceipts: Type.Boolean({
    description: "If true, parse transaction receipts for this contract.",
  }),
});

const responseSchema = Type.Object({
  result: contractSubscriptionSchema,
});

responseSchema.example = {
  result: {
    chain: 1,
    contractAddress: "0x....",
    status: "success",
  },
};

export async function addContractSubscription(fastify: FastifyInstance) {
  fastify.route<{
    Body: Static<typeof bodySchema>;
    Reply: Static<typeof responseSchema>;
  }>({
    method: "POST",
    url: "/contract-subscriptions/add",
    schema: {
      summary: "Add contract subscription",
      description:
        "Subscribe to event logs and transaction receipts for a contract.",
      tags: ["Contract-Subscriptions"],
      operationId: "addContractSubscription",
      body: bodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const {
        chain,
        contractAddress,
        webhookUrl,
        processEventLogs,
        filterEvents = [],
        processTransactionReceipts,
      } = request.body;

      const chainId = await getChainIdFromChain(chain);
      const standardizedContractAddress = contractAddress.toLowerCase();

      // Must parse logs or receipts.
      if (!processEventLogs && !processTransactionReceipts) {
        throw createCustomError(
          "Contract Subscriptions must parse event logs and/or receipts.",
          StatusCodes.BAD_REQUEST,
          "BAD_REQUEST",
        );
      }

      // If not currently indexed, upsert the latest block number.
      const subscribedChainIds = await getContractSubscriptionsUniqueChainIds();
      if (!subscribedChainIds.includes(chainId)) {
        try {
          const sdk = await getSdk({ chainId });
          const provider = sdk.getProvider();
          const currentBlockNumber = await provider.getBlockNumber();
          await upsertChainIndexer({ chainId, currentBlockNumber });
        } catch (error) {
          // this is fine, must be already locked, so don't need to update current block as this will be recent
        }
      }

      // Create the webhook (if provided).
      let webhookId: number | undefined;
      if (webhookUrl) {
        if (!isValidHttpUrl(webhookUrl)) {
          throw createCustomError(
            "Invalid webhook URL. Make sure it starts with 'https://'.",
            StatusCodes.BAD_REQUEST,
            "BAD_REQUEST",
          );
        }

        const webhook = await insertWebhook({
          eventType: WebhooksEventTypes.CONTRACT_SUBSCRIPTION,
          name: "(Auto-generated)",
          url: webhookUrl,
        });
        webhookId = webhook.id;
      }

      // Create the contract subscription.
      const contractSubscription = await createContractSubscription({
        chainId,
        contractAddress: standardizedContractAddress,
        webhookId,
        processEventLogs,
        filterEvents,
        processTransactionReceipts,
      });

      reply.status(StatusCodes.OK).send({
        result: toContractSubscriptionSchema(contractSubscription),
      });
    },
  });
}
