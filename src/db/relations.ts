import { relations } from "drizzle-orm/relations";
import {
  eoaCredentials,
  eoas,
  webhooks,
  addressSubscriptions,
  smartAccounts,
} from "./schema.js";

export const eoasRelations = relations(eoas, ({ one, many }) => ({
  credential: one(eoaCredentials, {
    fields: [eoas.credentialId],
    references: [eoaCredentials.id],
  }),
  smartAccounts: many(smartAccounts),
}));

export const smartAccountsRelations = relations(smartAccounts, ({ one }) => ({
  signer: one(eoas, {
    fields: [smartAccounts.signerAddress],
    references: [eoas.address],
  }),
}));

export const eoaCredentialsRelations = relations(
  eoaCredentials,
  ({ many }) => ({
    eoas: many(eoas),
  }),
);

export const addressSubscriptionsRelations = relations(
  addressSubscriptions,
  ({ one }) => ({
    webhook: one(webhooks, {
      fields: [addressSubscriptions.webhookId],
      references: [webhooks.id],
    }),
  }),
);

export const webhooksRelations = relations(webhooks, ({ many }) => ({
  addressSubscriptions: many(addressSubscriptions),
}));
