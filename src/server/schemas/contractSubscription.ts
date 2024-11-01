import type { ContractSubscriptions, Webhooks } from "@prisma/client";
import { Type, type Static } from "@sinclair/typebox";
import { AddressSchema } from "./address";
import { WebhookSchema, toWebhookSchema } from "./webhook";

export const contractSubscriptionSchema = Type.Object({
  id: Type.String(),
  chainId: Type.Integer(),
  contractAddress: AddressSchema,
  webhook: Type.Optional(WebhookSchema),
  processEventLogs: Type.Boolean(),
  filterEvents: Type.Array(Type.String()),
  processTransactionReceipts: Type.Boolean(),
  filterFunctions: Type.Array(Type.String()),
  createdAt: Type.Unsafe<Date>({
    type: "string",
    format: "date",
  }),
});

export const toContractSubscriptionSchema = (
  contractSubscription: ContractSubscriptions & { webhook: Webhooks | null },
): Static<typeof contractSubscriptionSchema> => ({
  id: contractSubscription.id,
  chainId: contractSubscription.chainId,
  contractAddress: contractSubscription.contractAddress,
  webhook: contractSubscription.webhook
    ? toWebhookSchema(contractSubscription.webhook)
    : undefined,
  processEventLogs: contractSubscription.processEventLogs,
  filterEvents: contractSubscription.filterEvents,
  processTransactionReceipts: contractSubscription.processTransactionReceipts,
  filterFunctions: contractSubscription.filterFunctions,
  createdAt: contractSubscription.createdAt,
});
