import { type Static, Type } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getContract } from "thirdweb";
import { isContractDeployed, shortenAddress } from "thirdweb/utils";
import { upsertChainIndexer } from "../../../../shared/db/chain-indexers/upsert-chain-indexer";
import { createContractSubscription } from "../../../../shared/db/contract-subscriptions/create-contract-subscription";
import { getContractSubscriptionsUniqueChainIds } from "../../../../shared/db/contract-subscriptions/get-contract-subscriptions";
import { insertWebhook } from "../../../../shared/db/webhooks/create-webhook";
import { WebhooksEventTypes } from "../../../../shared/schemas/webhooks";
import { getSdk } from "../../../../shared/utils/cache/get-sdk";
import { getChain } from "../../../../shared/utils/chain";
import { thirdwebClient } from "../../../../shared/utils/sdk";
import { createCustomError } from "../../../middleware/error";
import { AddressSchema } from "../../../schemas/address";
import { chainIdOrSlugSchema } from "../../../schemas/chain";
import {
  contractSubscriptionSchema,
  toContractSubscriptionSchema,
} from "../../../schemas/contract-subscription";
import { standardResponseSchema } from "../../../schemas/shared-api-schemas";
import { getChainIdFromChain } from "../../../utils/chain";
import { isValidWebhookUrl } from "../../../utils/validator";
import { getWebhook } from "../../../../shared/db/webhooks/get-webhook";
import { Webhooks } from "@prisma/client";

const bodySchema = Type.Object({
  chain: chainIdOrSlugSchema,
  contractAddress: {
    ...AddressSchema,
    description: "The address for the contract.",
  },
  webhookId: Type.Optional(
    Type.Number({
      description:
        "The ID of an existing webhook to use for this contract subscription. Either `webhookId` or `webhookUrl` must be provided.",
      examples: [1],
    }),
  ),
  webhookUrl: Type.Optional(
    Type.String({
      description:
        "Creates a new webhook to call when new onchain data is detected. Either `webhookId` or `webhookUrl` must be provided.",
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
        webhookId,
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

      // Get an existing webhook or create a new one.
      let webhook: Webhooks | null = null;
      if (webhookId) {
        webhook = await getWebhook(webhookId);
      } else if (webhookUrl && isValidWebhookUrl(webhookUrl)) {
        webhook = await insertWebhook({
          eventType: WebhooksEventTypes.CONTRACT_SUBSCRIPTION,
          name: `(Generated) Subscription for ${shortenAddress(contractAddress)}`,
          url: webhookUrl,
        });
      }
      if (!webhook) {
        throw createCustomError(
          'Failed to get or create webhook for contract subscription. Make sure you provide an valid "webhookId" or "webhookUrl".',
          StatusCodes.INTERNAL_SERVER_ERROR,
          "INTERNAL_SERVER_ERROR",
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
        } catch (_error) {
          // this is fine, must be already locked, so don't need to update current block as this will be recent
        }
      }

      // Create the contract subscription.
      const contractSubscription = await createContractSubscription({
        chainId,
        contractAddress: contractAddress.toLowerCase(),
        webhookId: webhook.id,
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
