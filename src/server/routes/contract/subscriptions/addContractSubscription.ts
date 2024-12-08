import { type Static, Type } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getContract } from "thirdweb";
import { isContractDeployed } from "thirdweb/utils";
import { upsertChainIndexer } from "../../../../shared/db/chainIndexers/upsertChainIndexer";
import { createContractSubscription } from "../../../../shared/db/contractSubscriptions/createContractSubscription";
import { getContractSubscriptionsUniqueChainIds } from "../../../../shared/db/contractSubscriptions/getContractSubscriptions";
import { insertWebhook } from "../../../../shared/db/webhooks/createWebhook";
import { WebhooksEventTypes } from "../../../../shared/schemas/webhooks";
import { getSdk } from "../../../../shared/utils/cache/getSdk";
import { getChain } from "../../../../shared/utils/chain";
import { thirdwebClient } from "../../../../shared/utils/sdk";
import { createCustomError } from "../../../middleware/error";
import { AddressSchema } from "../../../schemas/address";
import { chainIdOrSlugSchema } from "../../../schemas/chain";
import {
  contractSubscriptionSchema,
  toContractSubscriptionSchema,
} from "../../../schemas/contractSubscription";
import { standardResponseSchema } from "../../../schemas/sharedApiSchemas";
import { getChainIdFromChain } from "../../../utils/chain";
import { isValidWebhookUrl } from "../../../utils/validator";

const bodySchema = Type.Object({
  chain: chainIdOrSlugSchema,
  contractAddress: {
    ...AddressSchema,
    description: "The address for the contract.",
  },
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
        "A case-sensitive list of event names to filter event logs. Parses all event logs by default.",
      examples: ["Transfer"],
    }),
  ),
  processTransactionReceipts: Type.Boolean({
    description: "If true, parse transaction receipts for this contract.",
  }),
  filterFunctions: Type.Optional(
    Type.Array(Type.String(), {
      description:
        "A case-sensitive list of function names to filter transaction receipts. Parses all transaction receipts by default.",
      examples: ["mintTo"],
    }),
  ),
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
        filterFunctions = [],
      } = request.body;

      const chainId = await getChainIdFromChain(chain);

      // Must parse logs or receipts.
      if (!processEventLogs && !processTransactionReceipts) {
        throw createCustomError(
          "Contract Subscriptions must parse event logs and/or receipts.",
          StatusCodes.BAD_REQUEST,
          "BAD_REQUEST",
        );
      }

      // Assert a valid contract.
      const contract = getContract({
        client: thirdwebClient,
        chain: await getChain(chainId),
        address: contractAddress,
      });
      const isValid = await isContractDeployed(contract);
      if (!isValid) {
        throw createCustomError(
          "Invalid contract.",
          StatusCodes.BAD_REQUEST,
          "INVALID_CONTRACT",
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
        if (!isValidWebhookUrl(webhookUrl)) {
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
        contractAddress: contractAddress.toLowerCase(),
        webhookId,
        processEventLogs,
        filterEvents,
        processTransactionReceipts,
        filterFunctions,
      });

      reply.status(StatusCodes.OK).send({
        result: toContractSubscriptionSchema(contractSubscription),
      });
    },
  });
}
