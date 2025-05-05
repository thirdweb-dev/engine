ALTER TABLE "transactions" ADD COLUMN "clientId" text DEFAULT 'PRE_MIGRATION' NOT NULL;--> statement-breakpoint
CREATE INDEX "client_id_idx" ON "transactions" USING btree ("clientId");