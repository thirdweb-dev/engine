CREATE TABLE "address_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chainId" text NOT NULL,
	"address" text NOT NULL,
	"conditions" jsonb[],
	"webhookId" uuid,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone NOT NULL,
	"deletedAt" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "configuration" (
	"id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
	"chainOverrides" json DEFAULT '[]'::json NOT NULL,
	"webhookAuthBearerToken" text,
	"authDomain" text DEFAULT 'thirdweb.com' NOT NULL,
	"authEoaEncryptedJson" text NOT NULL,
	"accessControlAllowOrigin" json DEFAULT '["https://thirdweb.com","https://embed.ipfscdn.io"]'::json NOT NULL,
	"ipAllowlist" json[],
	"mtlsCertificateEncrypted" text,
	"mtlsPrivateKeyEncrypted" text,
	"walletProviderConfigs" json DEFAULT '{}'::json NOT NULL
);
--> statement-breakpoint
CREATE TABLE "eoa_credentials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"label" text NOT NULL,
	"data" json NOT NULL,
	"isDefault" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone NOT NULL,
	"deletedAt" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "eoas" (
	"address" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"encryptedJson" text,
	"label" text NOT NULL,
	"credentialId" uuid,
	"platformIdentifiers" jsonb,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone NOT NULL,
	"deletedAt" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "keypairs" (
	"hash" text PRIMARY KEY NOT NULL,
	"publicKey" text NOT NULL,
	"algorithm" text NOT NULL,
	"label" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone NOT NULL,
	"deletedAt" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"accountAddress" text PRIMARY KEY NOT NULL,
	"permissions" text NOT NULL,
	"label" text
);
--> statement-breakpoint
CREATE TABLE "relayers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"label" text,
	"chainId" text NOT NULL,
	"accountAddress" text NOT NULL,
	"allowedContracts" jsonb DEFAULT '[]'::jsonb,
	"allowedForwarders" jsonb DEFAULT '[]'::jsonb
);
--> statement-breakpoint
CREATE TABLE "smart_accounts" (
	"address" text NOT NULL,
	"signerAddress" text NOT NULL,
	"label" text NOT NULL,
	"factoryAddress" text NOT NULL,
	"entrypointAddress" text NOT NULL,
	"accountSalt" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone NOT NULL,
	"deletedAt" timestamp with time zone,
	CONSTRAINT "smart_accounts_address_signerAddress_pk" PRIMARY KEY("address","signerAddress")
);
--> statement-breakpoint
CREATE TABLE "tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"tokenMask" text NOT NULL,
	"accountAddress" text NOT NULL,
	"isAccessToken" boolean NOT NULL,
	"label" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL,
	"revokedAt" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" text NOT NULL,
	"batchIndex" integer NOT NULL,
	"chainId" text NOT NULL,
	"from" text,
	"transactionParams" jsonb NOT NULL,
	"transactionHash" text,
	"confirmedAt" timestamp with time zone,
	"confirmedAtBlockNumber" text,
	"enrichedData" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"executionParams" jsonb NOT NULL,
	"executionResult" jsonb,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"errorMessage" text,
	"cancelledAt" timestamp with time zone,
	CONSTRAINT "transactions_id_batchIndex_pk" PRIMARY KEY("id","batchIndex")
);
--> statement-breakpoint
CREATE TABLE "webhooks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"label" text,
	"url" text NOT NULL,
	"secret" text NOT NULL,
	"eventType" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone NOT NULL,
	"revokedAt" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "address_subscriptions" ADD CONSTRAINT "address_subscriptions_webhookId_webhooks_id_fk" FOREIGN KEY ("webhookId") REFERENCES "public"."webhooks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eoas" ADD CONSTRAINT "eoas_credentialId_eoa_credentials_id_fk" FOREIGN KEY ("credentialId") REFERENCES "public"."eoa_credentials"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "smart_accounts" ADD CONSTRAINT "smart_accounts_signerAddress_eoas_address_fk" FOREIGN KEY ("signerAddress") REFERENCES "public"."eoas"("address") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "address_subscriptions_deleted_at_not_null_idx" ON "address_subscriptions" USING btree ("deletedAt") WHERE "address_subscriptions"."deletedAt" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "address_subscriptions_webhook_id_idx" ON "address_subscriptions" USING btree ("webhookId");--> statement-breakpoint
CREATE INDEX "address_subscriptions_chainId_idx" ON "address_subscriptions" USING btree ("chainId");--> statement-breakpoint
CREATE INDEX "address_subscriptions_address_idx" ON "address_subscriptions" USING btree ("address");--> statement-breakpoint
CREATE INDEX "eoa_credentials_type_idx" ON "eoa_credentials" USING btree ("type");--> statement-breakpoint
CREATE UNIQUE INDEX "eoa_credentials_type_is_default_key" ON "eoa_credentials" USING btree ("type") WHERE "eoa_credentials"."isDefault" IS TRUE;--> statement-breakpoint
CREATE INDEX "eoa_credentials_deleted_at_not_null_idx" ON "eoa_credentials" USING btree ("deletedAt") WHERE "eoa_credentials"."deletedAt" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "eoas_deleted_at_not_null_idx" ON "eoas" USING btree ("deletedAt") WHERE "eoas"."deletedAt" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "smart_accounts_signer_address_idx" ON "smart_accounts" USING btree ("signerAddress");--> statement-breakpoint
CREATE INDEX "smart_accounts_deleted_at_not_null_idx" ON "smart_accounts" USING btree ("deletedAt") WHERE "smart_accounts"."deletedAt" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "transaction_hash_idx" ON "transactions" USING btree ("transactionHash");--> statement-breakpoint
CREATE INDEX "from_idx" ON "transactions" USING btree ("from");--> statement-breakpoint
CREATE INDEX "execution_params_idx" ON "transactions" USING gin ("executionParams");--> statement-breakpoint
CREATE INDEX "execution_result_idx" ON "transactions" USING gin ("executionResult");