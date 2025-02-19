ALTER TABLE "configuration" ALTER COLUMN "walletProviderConfigs" SET DATA TYPE json;--> statement-breakpoint
ALTER TABLE "configuration" ALTER COLUMN "walletProviderConfigs" SET DEFAULT '{}'::json;--> statement-breakpoint
ALTER TABLE "eoa_credentials" ALTER COLUMN "data" SET DATA TYPE json;--> statement-breakpoint
ALTER TABLE "eoas" ALTER COLUMN "label" SET NOT NULL;