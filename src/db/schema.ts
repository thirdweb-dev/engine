import {
  pgTable,
  timestamp,
  text,
  jsonb,
  uniqueIndex,
  index,
  boolean,
  uuid,
  json,
  primaryKey,
  integer,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import type { Address, Chain, Hex } from "thirdweb";
import {
  ENGINE_EOA_TYPES,
  type ExecutionParamsSerialized,
  type ExecutionResultSerialized,
  type Permission,
  type TransactionParamsSerialized,
  type WebhookEventType,
} from "./types.js";
import type {
  EoaCredential,
  EoaPlatformIdentifiers,
  WalletProviderConfigMap,
} from "../lib/accounts/accounts.js";

export const configuration = pgTable("configuration", {
  id: text().default("default").primaryKey().notNull(),
  chainOverrides: json().default([]).$type<Chain[]>().notNull(),

  webhookAuthBearerToken: text(),

  authDomain: text().notNull().default("thirdweb.com"),
  authEoaEncryptedJson: text().notNull(),

  accessControlAllowOrigin: json()
    .$type<string[]>()
    .default(["https://thirdweb.com", "https://embed.ipfscdn.io"])
    .notNull(),

  ipAllowlist: json().array().$type<string[]>(),

  mtlsCertificateEncrypted: text(),
  mtlsPrivateKeyEncrypted: text(),

  walletProviderConfigs: json()
    .$type<Partial<WalletProviderConfigMap>>()
    .default({})
    .notNull(),
});

export const transactions = pgTable(
  "transactions",
  {
    // id is idempotency key
    id: text().notNull(),
    // batch index is to identify and deduplicate transactions in the same batch
    batchIndex: integer().notNull(),

    clientId: text().notNull().default("PRE_MIGRATION"),

    chainId: text().notNull(),

    from: text().$type<Address>(), /// this is high-level, not the from address of the EOA transaction. for AA, this will be the Smart Account

    transactionParams: jsonb().$type<TransactionParamsSerialized[]>().notNull(),

    transactionHash: text().$type<Hex>(),
    confirmedAt: timestamp({ withTimezone: true }),
    confirmedAtBlockNumber: text(),

    enrichedData: jsonb().default([]).notNull(), // store transaction enriched data if available

    executionParams: jsonb().$type<ExecutionParamsSerialized>().notNull(), // store executor specific parameters
    // eg:
    // - for erc4337, store signerAddress
    // can store overrides like gas, nonce etc

    executionResult: jsonb().$type<ExecutionResultSerialized>(), // store executor specific result
    // for eg eoa will contain the receipt
    // external 4337 will contain the receipt, userophash, gasdata etc

    // functionName: text(),
    // functionArgs: text(),
    // extension: text(),
    // deployedContractAddress: text(),
    // deployedContractType: text(),
    // ^ these are now enriched data

    // these are now executor specific, and will represent intermediate stages that vary per executor
    // queuedAt: timestamp().defaultNow().notNull()
    // processedAt: timestamp(),
    // sentAt: timestamp(),
    // minedAt: timestamp(),

    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    errorMessage: text(),
    cancelledAt: timestamp({ withTimezone: true }),
  },
  (table) => [
    primaryKey({ columns: [table.id, table.batchIndex] }),
    index("transaction_hash_idx").on(table.transactionHash),
    index("client_id_idx").on(table.clientId),
    index("from_idx").on(table.from),
    index("execution_params_idx").using("gin", table.executionParams),
    index("execution_result_idx").using("gin", table.executionResult),
  ],
);

export const permissions = pgTable("permissions", {
  accountAddress: text().$type<Address>().primaryKey().notNull(),
  permissions: text().$type<Permission>().notNull(),
  label: text(),
});

export const tokens = pgTable("tokens", {
  id: text().primaryKey(),

  tokenMask: text().notNull(),
  accountAddress: text().notNull(),

  isAccessToken: boolean().notNull(),
  label: text(),

  createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp({ withTimezone: true }).notNull(),
  revokedAt: timestamp({ withTimezone: true }),
});

export const relayers = pgTable("relayers", {
  id: uuid().defaultRandom().primaryKey(),
  label: text(),
  chainId: text().notNull(),
  accountAddress: text().$type<Address>().notNull(), // reconsider tying to accountAddress,fk?

  allowedContracts: jsonb().$type<Address[]>().default([]),
  allowedForwarders: jsonb().$type<Address[]>().default([]),
});

export const webhooks = pgTable("webhooks", {
  id: uuid().defaultRandom().primaryKey(),
  label: text(),
  url: text().notNull(),
  secret: text().notNull(),
  eventType: text().$type<WebhookEventType>().notNull(),
  createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .$onUpdate(() => new Date()),
  revokedAt: timestamp({ withTimezone: true }),
});

export const eoaCredentials = pgTable(
  "eoa_credentials",
  {
    id: uuid().defaultRandom().primaryKey(),
    type: text().notNull(),
    label: text().notNull(),
    data: json().$type<EoaCredential>().notNull(),
    isDefault: boolean().notNull().default(false),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .$onUpdate(() => new Date()),
    deletedAt: timestamp({ withTimezone: true }),
  },
  (table) => [
    index("eoa_credentials_type_idx").on(table.type),
    uniqueIndex("eoa_credentials_type_is_default_key")
      .on(table.type)
      .where(sql`${table.isDefault} IS TRUE`),
    index("eoa_credentials_deleted_at_not_null_idx")
      .on(table.deletedAt)
      .where(sql`${table.deletedAt} IS NOT NULL`),
  ],
);

export const eoas = pgTable(
  "eoas",
  {
    address: text().$type<Address>().primaryKey(),
    type: text({ enum: ENGINE_EOA_TYPES }).notNull(),
    encryptedJson: text(),
    label: text().notNull(),

    credentialId: uuid().references(() => eoaCredentials.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),

    platformIdentifiers: jsonb().$type<EoaPlatformIdentifiers>(),

    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp({ withTimezone: true })
      .$onUpdate(() => new Date())
      .notNull(),
    deletedAt: timestamp({ withTimezone: true }),
  },
  (table) => [
    index("eoas_deleted_at_not_null_idx")
      .on(table.deletedAt)
      .where(sql`${table.deletedAt} IS NOT NULL`),
  ],
);

export const smartAccounts = pgTable(
  "smart_accounts",
  {
    address: text().$type<Address>().notNull(),
    signerAddress: text()
      .$type<Address>()
      .references(() => eoas.address)
      .notNull(),

    label: text().notNull(),
    factoryAddress: text().$type<Address>().notNull(),
    entrypointAddress: text().$type<Address>().notNull(),
    accountSalt: text(),

    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .$onUpdate(() => new Date()),
    deletedAt: timestamp({ withTimezone: true }),
  },
  (table) => [
    primaryKey({ columns: [table.address, table.signerAddress] }),
    index("smart_accounts_signer_address_idx").on(table.signerAddress),
    index("smart_accounts_deleted_at_not_null_idx")
      .on(table.deletedAt)
      .where(sql`${table.deletedAt} IS NOT NULL`),
  ],
);

export const addressSubscriptions = pgTable(
  "address_subscriptions",
  {
    id: uuid().defaultRandom().primaryKey(),
    chainId: text().notNull(),
    address: text().$type<Address>().notNull(),
    conditions: jsonb().array(),
    webhookId: uuid().references(() => webhooks.id),

    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .$onUpdate(() => new Date()),

    deletedAt: timestamp({ withTimezone: true }),
  },
  (table) => [
    index("address_subscriptions_deleted_at_not_null_idx")
      .on(table.deletedAt)
      .where(sql`${table.deletedAt} IS NOT NULL`),
    index("address_subscriptions_webhook_id_idx").on(table.webhookId),
    index("address_subscriptions_chainId_idx").on(table.chainId),
    index("address_subscriptions_address_idx").on(table.address),
  ],
);

export const keypairs = pgTable("keypairs", {
  hash: text().primaryKey().notNull(),
  publicKey: text().notNull(),
  algorithm: text().$type<"RS256" | "ES256" | "PS256">().notNull(),
  label: text(),
  createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .$onUpdate(() => new Date()),
  deletedAt: timestamp({ withTimezone: true }),
});

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
